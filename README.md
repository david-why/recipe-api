# recipe-api

This is a simple, RESTful, CRUD API for a recipes app, written in TypeScript with [Bun](https://bun.com). You can create and modify recipes, which consists of multiple steps and ingredients. You can also manage the ingredients, which are shared between recipes. There are plans to support looking up recipes from ingredients.

## Usage

The API is hosted on [Hack Club Nest](https://hackclub.app). Head over to [the OpenAPI docs](https://recipes.davidwhy.hackclub.app/docs) to learn how to use the API!

## Technical Notes

It seems that the `Bun.sql.begin` API is bugged in Bun v1.2.20 (latest as of this project), and the errors thrown inside may not get propagated. In other words, if an error occurs that causes the transaction to rollback, the request will hang.

I solved this by using Bun v1.2.13 to run the project, but this obviously isn't the best option. I opened [this issue](https://github.com/oven-sh/bun/issues/21934) on Bun's repo, so I hope it gets fixed soon!
