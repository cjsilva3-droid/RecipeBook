const pool = require('../db/pool');

const BASE_URL = process.env.BASE_URL || 'http://localhost:3000';

// Create a new recipe entry in the database
// Expects title, description, estimated_time (optional) and requires auth
exports.createRecipe = async (req, res) => {
    try {
        const { title, description, estimated_time } = req.body;

        // --- validation ---
        if (!title || title.trim().length === 0 || title.length > 25) {
            return res.status(400).json({ error: 'Title is required and must be 1-25 characters' });
        }
        if (!description || description.trim().length === 0 || description.length > 150) {
            return res.status(400).json({ error: 'Description is required and must be 1-150 characters' });
        }

        const user_id = req.user ? req.user.id : null;

        const image_url = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;

        const sql = `
            INSERT INTO recipes (user_id, title, description, estimated_time, image_url)
            VALUES (?, ?, ?, ?, ?)
        `;

        await pool.query(sql, [user_id, title.trim(), description.trim(), estimated_time || null, image_url]);

        res.json({ message: 'Recipe created successfully' });
    } catch (err) {
        console.error('createRecipe error:', err);
        res.status(500).json({ error: 'Failed to create recipe' });
    }
};

// Return all recipes (most recent first) including author name, average rating, comment count
exports.getRecipes = async (req, res) => {
    try {
        const [rows] = await pool.query(`
            SELECT
                r.id,
                r.title,
                r.description,
                r.estimated_time,
                r.image_url,
                r.created_at,
                r.updated_at,
                u.username AS author,
                COALESCE(AVG(rt.rating), 0) AS average_rating,
                COUNT(c.id) AS comment_count
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN ratings rt ON rt.recipe_id = r.id
            LEFT JOIN comments c ON c.recipe_id = r.id
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `);

        res.json(rows);
    } catch (err) {
        console.error('getRecipes error:', err);
        res.status(500).json({ error: 'Failed to fetch recipes' });
    }
};

// Return a single recipe by ID (useful for recipe detail pages)
exports.getRecipeById = async (req, res) => {
    try {
        const recipeId = parseInt(req.params.id, 10);
        if (Number.isNaN(recipeId)) {
            return res.status(400).json({ error: 'Invalid recipe id' });
        }

        const [rows] = await pool.query(`
            SELECT
                r.id,
                r.title,
                r.description,
                r.estimated_time,
                r.image_url,
                r.created_at,
                r.updated_at,
                u.username AS author,
                COALESCE(AVG(rt.rating), 0) AS average_rating,
                COUNT(c.id) AS comment_count
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN ratings rt ON rt.recipe_id = r.id
            LEFT JOIN comments c ON c.recipe_id = r.id
            WHERE r.id = ?
            GROUP BY r.id
        `, [recipeId]);

        if (!rows.length) {
            return res.status(404).json({ error: 'Recipe not found' });
        }

        res.json(rows[0]);
    } catch (err) {
        console.error('getRecipeById error:', err);
        res.status(500).json({ error: 'Failed to fetch recipe' });
    }
};

// Return only the current user's recipes (requires auth)
// Called by "My Recipes" page to show only recipes posted by the logged-in user
exports.getMyRecipes = async (req, res) => {
    try {
        const user_id = req.user ? req.user.id : null;

        if (!user_id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [rows] = await pool.query(`
            SELECT
                r.id,
                r.title,
                r.description,
                r.estimated_time,
                r.image_url,
                r.created_at,
                r.updated_at,
                u.username AS author,
                COALESCE(AVG(rt.rating), 0) AS average_rating,
                COUNT(c.id) AS comment_count
            FROM recipes r
            LEFT JOIN users u ON r.user_id = u.id
            LEFT JOIN ratings rt ON rt.recipe_id = r.id
            LEFT JOIN comments c ON c.recipe_id = r.id
            WHERE r.user_id = ?
            GROUP BY r.id
            ORDER BY r.created_at DESC
        `, [user_id]);

        res.json(rows);
    } catch (err) {
        console.error('getMyRecipes error:', err);
        res.status(500).json({ error: 'Failed to fetch your recipes' });
    }
};

// Update an existing recipe (requires auth and ownership)
exports.updateRecipe = async (req, res) => {
    try {
        const recipeId = parseInt(req.params.id, 10);
        if (Number.isNaN(recipeId)) {
            return res.status(400).json({ error: 'Invalid recipe id' });
        }

        const user_id = req.user ? req.user.id : null;
        if (!user_id) {
            return res.status(401).json({ error: 'Not authenticated' });
        }

        const [existing] = await pool.query('SELECT user_id FROM recipes WHERE id = ?', [recipeId]);
        if (!existing.length) {
            return res.status(404).json({ error: 'Recipe not found' });
        }
        if (existing[0].user_id !== user_id) {
            return res.status(403).json({ error: 'You are not allowed to edit this recipe' });
        }

        const { title, description, estimated_time } = req.body;

        // --- validation ---
        if (!title || title.trim().length === 0 || title.length > 25) {
            return res.status(400).json({ error: 'Title is required and must be 1-25 characters' });
        }
        if (!description || description.trim().length === 0 || description.length > 150) {
            return res.status(400).json({ error: 'Description is required and must be 1-150 characters' });
        }

        const image_url = req.file ? `${BASE_URL}/uploads/${req.file.filename}` : null;

        let sql;
        let params;

        if (image_url) {
            sql = `
                UPDATE recipes
                SET title = ?, description = ?, estimated_time = ?, image_url = ?
                WHERE id = ?
            `;
            params = [title.trim(), description.trim(), estimated_time || null, image_url, recipeId];
        } else {
            sql = `
                UPDATE recipes
                SET title = ?, description = ?, estimated_time = ?
                WHERE id = ?
            `;
            params = [title.trim(), description.trim(), estimated_time || null, recipeId];
        }

        await pool.query(sql, params);

        res.json({ message: 'Recipe updated successfully' });
    } catch (err) {
        console.error('updateRecipe error:', err);
        res.status(500).json({ error: 'Failed to update recipe' });
    }
};
