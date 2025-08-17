CREATE TABLE IF NOT EXISTS ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    default_unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    title TEXT NOT NULL,
    description TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_steps (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ordinal FLOAT NOT NULL,
    instruction TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_id UUID REFERENCES recipes(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES ingredients(id) ON DELETE CASCADE,
    quantity FLOAT NOT NULL,
    unit TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS recipe_step_ingredients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    recipe_step_id UUID REFERENCES recipe_steps(id) ON DELETE CASCADE,
    ingredient_id UUID REFERENCES recipe_ingredients(id) ON DELETE CASCADE
);
