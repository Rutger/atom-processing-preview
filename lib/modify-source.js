'use babel';

export function transcodeFullScreen(code, dimensions) {
	return code.replace(/fullScreen\((.*?)\)/g, (code, matches) => {
		matches = matches.split(',');
		const findRenderer = (match) => {
			match = match.trim();
			return !parseInt(match) && match !== 'SPAN';
		};
		let renderer = matches.find(findRenderer);

		return `size(${dimensions.width}, ${dimensions.height}${renderer ? `, ${renderer}` : ''})`;
	});

};

export function transcodePixelDensity(code) {
	return code.replace(/pixelDensity\(.*?\)/g, '');
};
