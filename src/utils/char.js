import wcwidth from 'wcwidth';

export function dbcswidth(str) {
	return str.split("").reduce(function(sum, c) {
		return sum + (c.charCodeAt(0) > 255 ? 2 : 1);
	}, 0);
}
/**
* calculate width of string.
* @params {string} str - string to calculate
* @params {boolean} widthType - calculate width by wcwidth or String.length
*/
export function getWidth(widthType, str) {
	switch (widthType) {
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
* @params {string} str - string to calculate
* @params {number} width - the width of target string
* @params {boolean} widthType - calculate width by wcwidth or String.length
*/
export function indexOfWidth(widthType, str, width) {
	if (widthType === false)
		return width;
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
* @params {string} str - string to calculate
* @params {number} start - the beginning position of string
* @params {number} width - the width of target string
* @params {boolean} widthType - calculate width by wcwidth or String.length
*/
export function substrWidth(widthType, str, startWidth, width) {
	var length = width;
	var start = startWidth;
	var prefixSpace = 0, suffixSpace;
	if (widthType !== false) {
		start = indexOfWidth(widthType, str, startWidth);
		if (getWidth(widthType, str.substr(0, start)) < startWidth) {
			start++;
			prefixSpace = getWidth(widthType, str.substr(0, start)) - startWidth;
		}
		length = indexOfWidth(widthType, str.substr(start), width - prefixSpace);
		suffixSpace = Math.min(width, getWidth(widthType, str.substr(start))) -
			(prefixSpace + getWidth(widthType, str.substr(start, length)));
	}
	return " ".repeat(prefixSpace) + str.substr(start, length) + " ".repeat(suffixSpace);
}
