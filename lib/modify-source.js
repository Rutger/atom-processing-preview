'use babel';

export function transcodeFullscreen(code, dimensions) {
	return code.replace(/fullScreen\(\)/g, `size(${dimensions.width}, ${dimensions.height})`);
};
