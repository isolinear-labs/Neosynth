const express = require('express');
const swaggerUi = require('swagger-ui-express');
const yaml = require('js-yaml');
const fs = require('fs');
const path = require('path');

const router = express.Router();

// Load OpenAPI spec
const swaggerDocument = yaml.load(fs.readFileSync(path.join(__dirname, '../apiSpec/openapi.yaml'), 'utf8'));

// Serve OpenAPI spec as JSON
router.get('/openapi.json', (req, res) => {
    res.json(swaggerDocument);
});

// Serve OpenAPI spec as YAML
router.get('/openapi.yaml', (req, res) => {
    const yamlFile = path.join(__dirname, '../apiSpec/openapi.yaml');
    res.sendFile(yamlFile);
});

// Serve custom CSS file
router.get('/swagger-theme.css', (req, res) => {
    const cssFile = path.join(__dirname, '../custom/swagger-theme.css');
    res.type('text/css');
    res.sendFile(cssFile);
});

const swaggerOptions = {
    customCssUrl: '/api/swagger-theme.css',
    customSiteTitle: 'NeoSynth API Documentation',
    customfavIcon: '/favicon.png',
    swaggerOptions: {
        theme: 'ux',
        validatorUrl: null,
        docExpansion: 'list',
        defaultModelsExpandDepth: 2,
        defaultModelExpandDepth: 2,
        tryItOutEnabled: true,
        displayRequestDuration: true
    }
};

// Serve Swagger UI
router.use('/swagger', swaggerUi.serve);
router.get('/swagger', swaggerUi.setup(swaggerDocument, swaggerOptions));

// Custom documentation page that uses OpenAPI spec
router.get('/docs', (req, res) => {
    const docsPath = path.join(__dirname, '../frontend/api-docs.html');
	
    // Check if custom docs exist, otherwise serve the basic page
    if (require('fs').existsSync(docsPath)) {
        res.sendFile(docsPath);
    } else {
        res.send(`
			<!DOCTYPE html>
			<html lang="en">
			<head>
				<meta charset="UTF-8">
				<meta name="viewport" content="width=device-width, initial-scale=1.0">
				<title>NeoSynth API Documentation</title>
				<link rel="icon" type="image/x-icon" href="/favicon.png">
				<style>
					body {
						font-family: 'Courier New', monospace;
						background-color: #0d0221;
						color: #ffffff;
						padding: 40px;
						text-align: center;
					}
					h1 {
						color: #8AFFFF;
						font-size: 2.5rem;
						text-shadow: 0 0 10px #8AFFFF;
						margin-bottom: 20px;
					}
					.options {
						display: flex;
						justify-content: center;
						gap: 30px;
						margin-top: 40px;
					}
					a {
						display: inline-block;
						padding: 15px 30px;
						background-color: rgba(13, 2, 33, 0.8);
						border: 1px solid #00FFAA;
						color: #00FFAA;
						text-decoration: none;
						border-radius: 5px;
						transition: all 0.3s ease;
						font-weight: bold;
						text-transform: uppercase;
					}
					a:hover {
						background-color: rgba(0, 255, 170, 0.2);
						box-shadow: 0 0 15px rgba(0, 255, 170, 0.5);
						transform: translateY(-2px);
					}
					.back-link {
						border-color: #FF5E78;
						color: #FF5E78;
					}
					.back-link:hover {
						background-color: rgba(255, 94, 120, 0.2);
						box-shadow: 0 0 15px rgba(255, 94, 120, 0.5);
					}
				</style>
			</head>
			<body>
				<h1>NeoSynth API Documentation</h1>
				<div class="options">
					<a href="/api/swagger">Swagger UI</a>
					<a href="/api/openapi.json">OpenAPI JSON</a>
					<a href="/api/openapi.yaml">OpenAPI YAML</a>
					<a href="/" class="back-link">Back to App</a>
				</div>
			</body>
			</html>
		`);
    }
});

module.exports = router;