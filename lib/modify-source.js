'use babel';

export function transcodeFullScreen(code, dimensions) {
	return code.replace(/fullScreen\((.*?)\)/g, (code, matches) => {
		matches = matches.split(',');
		const findRenderer = (match) => {
			return !parseInt(match);
		};
		let renderer = matches.find(findRenderer);

		return `size(${dimensions.width}, ${dimensions.height}${renderer ? `, ${renderer}` : ''})`;
	});

};

export function transcodePixelDensity(code) {
	return code.replace(/pixelDensity\(.*?\)/g, '');
};
