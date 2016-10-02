'use babel';

import { allowUnsafeEval } from 'loophole';
import fs from 'fs';

allowUnsafeEval(() => {
	const dir = atom.packages.getPackageDirPaths()[0];

	const processing = fs.readFileSync(`${atom.packages.getPackageDirPaths()[0]}/atom-processing-preview/node_modules/processing-js/processing.min.js`.toString('utf-8'));

	eval(processing);
	module.exports = Processing;
});
