'use babel';

import 'processing-js';

Processing.logger.println.apply = (logger, messages) => {
	console.log(messages[0]);
};

module.exports = Processing;
