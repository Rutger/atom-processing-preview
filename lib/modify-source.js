'use babel';

export function transcodeFullScreen(code, dimensions) {
	return code.replace(/fullScreen\(\)/g, `size(${dimensions.width}, ${dimensions.height})`);
};
