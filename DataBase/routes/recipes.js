const express = require('express');
const router = express.Router();

// Controllers for recipes, comments, and ratings
const {
    createRecipe,
    getRecipes,
    getRecipeById,
    getMyRecipes
} = require('../controllers/recipesController');
const {
    getCommentsForRecipe,
    postComment
} = require('../controllers/commentsController');
const {
    getRatingsForRecipe,
    postRating
} = require('../controllers/ratingsController');

const { authenticateToken } = require('../middleware/authMiddleware');

// Protected route to create a recipe (requires auth)
// Must be BEFORE /:id route so "POST /" matches before "GET /:id"
router.post('/', authenticateToken, createRecipe);

// Public route to fetch all recipes (public feed)
router.get('/', getRecipes);

// Protected route to fetch only the current user's recipes (requires auth)
router.get('/my', authenticateToken, getMyRecipes);

// Public route to fetch a single recipe by ID
router.get('/:id', getRecipeById);

// Comments on a recipe
router.get('/:id/comments', getCommentsForRecipe);
router.post('/:id/comments', authenticateToken, postComment);

// Ratings on a recipe
router.get('/:id/ratings', getRatingsForRecipe);
router.post('/:id/ratings', authenticateToken, postRating);

module.exports = router;
