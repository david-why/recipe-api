CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    flags INT NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ordinal FLOAT NOT NULL,
    instruction TEXT NOT NULL,
    UNIQUE (recipe_id, ordinal)
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID NOT NULL REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID NOT NULL REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity FLOAT NOT NULL,
    unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_step_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_step_id UUID NOT NULL REFERENCES recipe_steps(id) ON DELETE CASCADE,
    recipe_ingredient_id UUID NOT NULL REFERENCES recipe_ingredients(id) ON DELETE CASCADE,
    UNIQUE (recipe_step_id, recipe_ingredient_id)
);
