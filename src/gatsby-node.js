const _ = require(`lodash`)
const visit = require(`unist-util-visit`)
const { createRemoteFileNode } = require(`gatsby-source-filesystem`)
const { fluid } = require(`gatsby-plugin-sharp`)
const Img = require(`gatsby-image`)
const sizeOf = require('image-size')
const React = require(`react`)
const ReactDOMServer = require(`react-dom/server`)
var unified = require('unified')
var parse = require('rehype-parse')


const getContext = (node, field) => node && node.context && node.context[field]

module.exports = async ({
    htmlAst,
    htmlNode,
    actions: { createNode },
    createNodeId,
    store,
    cache,
    reporter,
}, pluginOptions = {
  withWebp: true
}) => {
    const url = getContext(htmlNode, `url`)
    const slug = getContext(htmlNode, `slug`)

    if (!url && slug){
        reporter.warn(`Expected url and slug not defined.`)
        return htmlAst
    }

    function isUrl(s) {
        const regexp = /(ftp|http|https):\/\/(\w+:{0,1}\w*@)?(\S+)(:[0-9]+)?(\/|\/([\w#!:.?+=&%@!\-/]))?/
        return regexp.test(s)
    }

    const cmsUrl = _.head(_.split(url, slug, 1))
    if (!isUrl(cmsUrl)) {
        return htmlAst
    }

		const nodes = [];
    visit(htmlAst, { tagName: `img` }, async (node) => {
			nodes.push(node);
		});
		

		await Promise.all(nodes.map(async node => {
			const src = node.properties && node.properties.src;
			const newNodeHTML = await replaceNewImage(
				node,
				cache,
				store,
				createNode,
				createNodeId,
				reporter,
				pluginOptions
			);
			if (newNodeHTML) {
				const what = unified()
					.use(parse, { fragment: true })
					.parse(newNodeHTML)
				node.tagName = what.children[0]['tagName'];
				node.properties = what.children[0]['properties'];
				node.children = what.children[0]['children'];
				node.position = what.children[0]['position'];
			}
			return node;
		}))

    return htmlAst;
}

const replaceNewImage = async (
  node,
  cache,
  store,
  createNode,
  createNodeId,
  reporter,
  options
) => {
  //console.log(node);
  const url = node.properties.src;
  let imageNode;
  try {
		imageNode = await downloadMediaFile({
			url,
			cache,
			store,
			createNode,
			createNodeId,
		})
	} catch (e) {
		// If the image without WP resize parameters on the URL does not exist it means that the original file has sizes
		// Try to download the image with the original URL
		try {
			imageNode = await downloadMediaFile({
				url: originalUrl,
				cache,
				store,
				createNode,
				createNodeId,
			})
		} catch (e) {
			// Do nothing
		}
  }
  //console.log({ imageNode });

  if (!imageNode) return

	let formattedImgTag = {}
	formattedImgTag.url = url
	formattedImgTag.classList = node.properties.className || []
	// formattedImgTag.title = thisImg.attr(`title`)
	// formattedImgTag.alt = thisImg.attr(`alt`)

	const dimensions = sizeOf(imageNode.absolutePath);
	if (dimensions.width) formattedImgTag.width = dimensions.width;
  if (dimensions.height) formattedImgTag.height = dimensions.height;

	if (!formattedImgTag.url) return

	const fileType = imageNode.ext

	// Ignore gifs as we can't process them,
	// svgs as they are already responsive by definition
	if (fileType !== `gif` && fileType !== `svg`) {
		const rawHTML = await generateImagesAndUpdateNode({
			formattedImgTag,
			imageNode,
			options,
			cache,
			reporter
		})

		// Replace the image string
		if (rawHTML) {
      return rawHTML;
    }
  }
  
}

const generateImagesAndUpdateNode = async function({
	formattedImgTag,
	imageNode,
	options,
	cache,
	reporter
}) {
	if (!imageNode || !imageNode.absolutePath) return

	let fluidResultWebp
	let fluidResult = await fluid({
		file: imageNode,
		args: {
			...options,
			maxWidth: formattedImgTag.width || options.maxWidth,
		},
		reporter,
		cache,
	})

	if (options.withWebp) {
		fluidResultWebp = await fluid({
			file: imageNode,
			args: {
				...options,
				maxWidth: formattedImgTag.width || options.maxWidth,
				toFormat: "WEBP",
			},
			reporter,
			cache,
		})
	}

	if (!fluidResult) return

	if (options.withWebp) {
		fluidResult.srcSetWebp = fluidResultWebp.srcSet
	}

	const imgOptions = {
		fluid: fluidResult,
		style: {
			maxWidth: "100%",
		},
		// Force show full image instantly
		// critical: true, // depricated
		loading: "eager",
		alt: formattedImgTag.alt,
		// fadeIn: true,
		imgStyle: {
			opacity: 1,
		},
	}
	if (formattedImgTag.width) imgOptions.style.width = formattedImgTag.width

	const ReactImgEl = React.createElement(Img.default, imgOptions, null)
	return ReactDOMServer.renderToString(ReactImgEl)
}

const downloadMediaFile = async ({
	url,
	cache,
	store,
	createNode,
	createNodeId,
}) => {
	let fileNode = false
	try {
		fileNode = await createRemoteFileNode({
			url,
			store,
			cache,
			createNode,
			createNodeId,
		});
	} catch (e) {
		throw Error(e);
	}

	return fileNode;
}