// Create this file as frontend/modules/mobile/appElementsFactory.js

import { APP_ELEMENTS_CONFIG } from './appElementsConfig.js';

/**
 * Factory function to create the appElements object for mobile modules
 * @param {Object} appScope - The scope containing all app variables and functions
 * @returns {Object} - Configured appElements object
 */
export function createAppElements(appScope) {
    const appElements = {};
	
    // Get DOM elements by ID
    for (const [key, elementId] of Object.entries(APP_ELEMENTS_CONFIG.domElements)) {
        appElements[key] = document.getElementById(elementId);
        if (!appElements[key]) {
            console.warn(`Element with ID '${elementId}' not found`);
        }
    }
	
    // Extract functions from app scope
    for (const functionName of APP_ELEMENTS_CONFIG.functions) {
        if (typeof appScope[functionName] === 'function') {
            appElements[functionName] = appScope[functionName];
        } else {
            console.warn(`Function '${functionName}' not found in app scope`);
        }
    }
	
    // Extract variables from app scope
    for (const variableName of APP_ELEMENTS_CONFIG.variables) {
        if (appScope[variableName] !== undefined) {
            appElements[variableName] = appScope[variableName];
        } else {
            console.warn(`Variable '${variableName}' not found in app scope`);
        }
    }
	
    // Extract reactive objects from app scope
    for (const objectName of APP_ELEMENTS_CONFIG.reactiveObjects) {
        if (appScope[objectName] !== undefined) {
            appElements[objectName] = appScope[objectName];
        } else {
            console.warn(`Reactive object '${objectName}' not found in app scope`);
        }
    }
	
    return appElements;
}

/**
 * Helper function to create a proxy for app scope that automatically updates appElements
 * @param {Object} appScope - The app scope
 * @param {Object} appElements - The app elements object
 * @returns {Object} - Proxy that keeps appElements in sync
 */
export function createAppScopeProxy(appScope, appElements) {
    return new Proxy(appScope, {
        set(target, property, value) {
            target[property] = value;
			
            // Update appElements if this property is tracked
            if (APP_ELEMENTS_CONFIG.variables.includes(property) || 
				APP_ELEMENTS_CONFIG.reactiveObjects.includes(property) ||
				APP_ELEMENTS_CONFIG.functions.includes(property)) {
                appElements[property] = value;
            }
			
            return true;
        }
    });
}