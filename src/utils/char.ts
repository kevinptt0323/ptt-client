import wcwidth from 'wcwidth';

export function dbcswidth(str: string): number {
	return str.split("").reduce(function(sum, c) {
		return sum + (c.charCodeAt(0) > 255 ? 2 : 1);
	}, 0);
}
/**
* calculate width of string.
* @params {string} widthType - calculate width by wcwidth or String.length
* @params {string} str - string to calculate
*/
export function getWidth(widthType: string, str: string): number {
	switch (widthType) {
		case 'length':
			return str.length;
		case 'wcwidth':
			return wcwidth(str);
		case 'dbcs':
			return dbcswidth(str);
		default:
			throw `Invalid widthType "${widthType}"`;
	}
}

/**
* calculate the position that the prefix of string is a specific width
* @params {string} widthType - calculate width by wcwidth or String.length
* @params {string} str - string to calculate
* @params {number} width - the width of target string
*/
export function indexOfWidth(widthType: string, str: string, width?: number): number {
	if (widthType === 'length')
		return getWidth(widthType, str);
	for (var i = 0; i <= str.length; i++) {
		if (getWidth(widthType, str.substr(0, i)) > width)
			return i - 1;
	}
	return str.length;
}

/**
* extract parts of string, beginning at the character at the specified position,
* and returns the specified width of characters. if the character is incomplete,
* it will be replaced by space.
* @params {string} widthType - calculate width by wcwidth or String.length
* @params {string} str - string to calculate
* @params {number} startWidth - the beginning position of string
* @params {number} width - the width of target string
*/
export function substrWidth(widthType: string, str: string, startWidth: number, width?: number): string {
	var ignoreWidth = typeof width === 'undefined';
	var length = width;
	var start = startWidth;
	var prefixSpace = 0, suffixSpace = 0;
	if (widthType !== 'length') {
		start = indexOfWidth(widthType, str, startWidth);
		if (getWidth(widthType, str.substr(0, start)) < startWidth) {
			start += 1;
			prefixSpace = Math.max(getWidth(widthType, str.substr(0, start)) - startWidth, 0);
		}
		if (!ignoreWidth) {
			length = indexOfWidth(widthType, str.substr(start), width - prefixSpace);
			suffixSpace = Math.min(width, getWidth(widthType, str.substr(start))) -
				(prefixSpace + getWidth(widthType, str.substr(start, length)));
		}
	}
	var substr = ignoreWidth ? str.substr(start) : str.substr(start, length);
	return " ".repeat(prefixSpace) + substr + " ".repeat(suffixSpace);
}
