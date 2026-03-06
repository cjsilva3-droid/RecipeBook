const express = require("express");
const router = express.Router();
const pool = require("../db/pool");
const authRequired = require("../../authRequired"); // middleware

// GET all recipes
router.get("/", async (req, res) => {
    try {
        const result = await pool.query("SELECT * FROM recipes ORDER BY recipe_id DESC");
        res.json(result.rows);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// GET single recipe
router.get("/:id", async (req, res) => {
    try {
        const recipeId = req.params.id;

        const result = await pool.query(
            "SELECT * FROM recipes WHERE recipe_id=$1",
            [recipeId]
        );

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// UPDATE recipe (owner only)
router.put("/:id", authRequired, async (req, res) => {
    try {
        const recipeId = req.params.id;
        const { title, description } = req.body;
        const userId = req.user.id;

        const result = await pool.query(
            "UPDATE recipes SET title=$1, description=$2 WHERE recipe_id=$3 AND user_id=$4 RETURNING *",
            [title, description, recipeId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(403).send("Not authorized");
        }

        res.json(result.rows[0]);
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

// DELETE recipe
router.delete("/:id", authRequired, async (req, res) => {
    try {
        const recipeId = req.params.id;
        const userId = req.user.id;

        const result = await pool.query(
            "DELETE FROM recipes WHERE recipe_id=$1 AND user_id=$2",
            [recipeId, userId]
        );

        if (result.rowCount === 0) {
            return res.status(403).send("Not authorized");
        }

        res.send("Deleted");
    } catch (err) {
        console.error(err);
        res.status(500).send("Server error");
    }
});

module.exports = router;