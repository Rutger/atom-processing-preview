'use babel';

export function transcodeFullScreen(code, dimensions) {
	return code.replace(/fullScreen\(\)/g, `size(${dimensions.width}, ${dimensions.height})`);
};

export function transcodePixelDensity(code) {
	return code.replace(/pixelDensity\(.*?\)/g, '');
};
