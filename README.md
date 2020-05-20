# gatsby-rehype-inline-images

Downloads images inside the content from [Ghost CMS](https://ghost.org/changelog/jamstack/). This plugin is designed to work with a headless Ghost CMS only.

## Install

`yarn add gatsby-transformer-rehype @draftbox-co/gatsby-rehype-inline-images`

## How to use

```javascript
// In your gatsby-config.js
plugins: [
  {
    resolve: `gatsby-transformer-rehype`,
    options: {
      plugins: [
        {
          resolve: `@draftbox-co/gatsby-rehype-inline-images`,
        },
      ],
    },
  },
]
```

## Contributions

PRs are welcome! Consider contributing to this project if you are missing feature that is also useful for others.


# Copyright & License

Copyright (c) 2020 [Draftbox](https://draftbox.co) - Released under the [MIT license](LICENSE).
