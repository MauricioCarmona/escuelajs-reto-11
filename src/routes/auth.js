const express = require('express');
const passport = require('passport');
const boom = require('@hapi/boom');
const jwt = require('jsonwebtoken');
const ApiKeysService = require('../services/apiKeys');
const UserService = require('../services/users');
const validationHandler = require('../utils/middleware/validationHandler');

const {
    createUserSchema,
    createProviderUserSchema
} = require('../utils/schemas/users');

const { config } = require('../config');

// Basic Strategy
require('../utils/auth/strategies/basic');

function authApi(app) {
    const router = express.Router();
    app.use('/api/auth', router);

    const apiKeysService = new ApiKeysService();
    const userService = new UserService();

    router.post('/sign-in', async function(req, res, next) {
        const { apiKeyToken } = req.body;

        if (!apiKeyToken) {
            next(boom.unauthorized('apiKeyToken is required'));
        }

        passport.authenticate('basic', function(err, user) {
            try {
                if (err || !user) {
                    next(boom.unauthorized());
                }

                req.login(user, { session: false }, async function(err) {
                    if (err) {
                        next(err);
                    }

                    const apiKey = await apiKeysService.getApiKey({ token: apiKeyToken });

                    if (!apiKey) {
                        next(boom.unauthorized());
                    }

                    const { _id: id, name, email } = user;

                    const payload = {
                        sub: id,
                        name,
                        email,
                        scopes: apiKey.scopes,
                    };

                    const token = jwt.sign(payload, config.authJwtSecret, {
                        expiresIn: '15m'
                    });

                    return res.status(200).json({ token, user: { id, name, email } });
                });
            } catch (err) {
                next(err);
            }
        })(req, res, next);
    });

    router.post('/sign-up', validationHandler(createUserSchema), async function(req, res, next) {
        const { body: user } = req;

        try {
            const createUserId = await userService.createUser({ user });

            res.status(201).json({
                data: createUserId,
                message: 'user created'
            });
        } catch (err) {
            next(err);
        }
    });

    router.post('/sign-provider', validationHandler(createProviderUserSchema), async function(req, res, next) {
        const { body } = req;

        const { apiKeyToken, ...user } = body;

        if (!apiKeyToken) {
            next(boom.unauthorized('apiKeyToken is required'));
        }

        try {
            const queriedUser = await usersService.getOrCreateUser({ user });
            const apiKey = await apiKeysService.getApiKey({ token: apiKeyToken });

            if (!apiKey) {
                next(boom.unauthorized());
            }

            const { _id: id, name, email } = queriedUser;

            const payload = {
                sub: id,
                name,
                email,
                scopes: apiKey.scopes,
            };

            const token = jwt.sign(payload, config.authJwtSecret, {
                expiresIn: '15m'
            });

            return res.status(200).json({ token, user: { id, name, email } });
        } catch (err) {
            next(err);
        }
    });
}

module.exports = authApi;
