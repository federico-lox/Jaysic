/**
 * Jaysic intepreter
 *
 * @author Federico "Lox" Lucignano <http://plus.ly/federico.lox>
 */

/*global define, module, console*/
(function (context) {
	'use strict';

	var commandPattern = '[^\'"\\(\\)\\s\\-]+',
		commentPattern = '([^\']*/{2}[^\']*)',
		floatPattern = '[-+]?\\d*\\.\\d+',
		integerPattern = '[-+]?\\d+',
		numberPattern = '[-+]?\\d*\\.?\\d+',
		parameterPattern = '[\\S]+',
		stringPattern = "'(\\'|[^'])*?'",
		subCommandPattern = '\\([^\\(\\)]*\\)',
		subCommandPatternLoose = '\\(.*\\)',
		//identifies each component in a statement like COMMAND PAR1 PAR2 "PAR3" (SUBCOMMAND ...)
		statementRegEx = new RegExp('^\\s*(' + commandPattern + ')((?:\\s(?:' + parameterPattern + '))*)\\s*$', 'ig'),
		paramRegEx = new RegExp('(' + commandPattern + '|' + numberPattern + '|' + stringPattern + '|' + subCommandPatternLoose + ')', 'ig'),
		//anything after a // sequence will be ignored till the end of the line
		//if not wrapped in a string, e.g. '//this is not a comment' //but this is
		commentRegEx = new RegExp(commentPattern + '$', 'ig'),
		//e.g. 1.5 or .7
		floatRegEx = new RegExp('^' + floatPattern + '$', 'g'),
		//e.g. 9
		integerRegEx = new RegExp('^' + integerPattern + '$', 'g'),
		//e.g. 'test' 'it&apos;s cool'
		stringRegEx = new RegExp('^' + stringPattern + '$', 'g'),
		//e.g, (sum 5 6)
		subCommandRegEx = new RegExp(subCommandPattern, 'g'),
		commands = {},
		lines,
		linesCounter,
		document = context.document,
		scriptType = 'text/jaysic',
		//help minification
		undefType = 'undefined',
		variables = {};

	/**
	 * @private
	 *
	 * Internal command representation
	 */
	function Command(id, implementation, variableSubstitution) {
		this.id = id;
		this.implementation = implementation;
		this.performVariableSubstitution = (typeof variableSubstitution === undefType) ? true : variableSubstitution;
	}

	Command.prototype.run = function (parameters) {
		console.log(this.id, parameters);
		return this.implementation.apply(variables, parameters);
	};

	/**
	 * @public
	 *
	 * Registers a command and makes it available in scripts
	 *
	 * @param {String} commandId The identifier for the command
	 * @param {Function} implementation The actual implementation for the command as a function
	 */
	function registerCommand(commandId, implementation, variableSubstitution) {
		commands[commandId] = new Command(commandId, implementation, variableSubstitution);
	}

	/**
	 * @private
	 *
	 * Returns the number of the line being processed,
	 * undefined if no script is in progress
	 */
	function getCurrentLineNumber() {
		return linesCounter;
	}

	/**
	 * @private
	 *
	 * Returns the number of the line being processed,
	 * undefined if no script is in progress
	 */
	function getCurrentLine() {
		return (linesCounter && lines) ? lines[linesCounter - 1] : undefined;
	}

	/**
	 * @private
	 *
	 * Converts a string into it's numerical representation if needed
	 *
	 * @params {mixed} value The value to extract a number from
	 * @returns {mixed} the numerical representation if there was one, the original value untouched otherwise
	 */
	function processNumbers(value) {
		//reset RegExp status
		integerRegEx.lastIndex = floatRegEx.lastIndex = 0;

		if (typeof value === 'string') {
			if (integerRegEx.test(value)) {
				//~~ converts any type always to a number (0 in case of utter failure)
				//this is the desired behavior for Jaysic (parseInt would return NaN for failure)
				value = ~~value;
			} else if (floatRegEx.test(value)) {
				value = parseFloat(value);
			}
		}

		return value;
	}

	/**
	 * @private
	 *
	 * Processes a single line in a Jaysic script
	 *
	 * @param {String} source A single line of Jaysic
	 */
	function processLine(line) {
		var command,
			commandId,
			match,
			parameters = [],
			paramString,
			ret,
			subMatch,
			subValue,
			value,
			x,
			y;

		//purge line from comment statements
		line = line.replace(commentRegEx, '');

		//if it wasn't a line containing only comments
		if (line.length > 0) {
			//reset global RegExp status
			subCommandRegEx.lastIndex = stringRegEx.lastIndex = statementRegEx.lastIndex = 0;
			match = statementRegEx.exec(line);

			if (match instanceof Array && match.length > 1) {
				commandId = match[1].toLowerCase();
				command = commands[commandId];
				paramString = match[2];

				if (!command) {
					//TODO: switch to a custom error object able to handle the line number and print the code of line-2 to line+2
					throw '[Jaysic] Unknown command "' + commandId + '" at line ' + getCurrentLineNumber() + "\n>" + getCurrentLine();
				} else {
					match = paramString.match(paramRegEx);

					if (match instanceof Array && match.length > 0) {
						for (x = 0, y = match.length; x < y; x += 1) {
							//reset global RegExp status
							subCommandRegEx.lastIndex = stringRegEx.lastIndex = 0;
							value = match[x];

							while(subMatch = subCommandRegEx.exec(value)){
								subValue = subMatch[0];
								subValue = processLine(subValue.substring(1, subValue.length - 1));
								//TODO: this is just text replacement, it won't work with array and object references
								//switch to a table of symbols
								value = value.replace(subMatch[0], subValue);
							}

							if (stringRegEx.test(value)) {
								//exclude the wrapping single quotes
								value = value.substring(1, value.length - 1);
							} else {
								value = processNumbers(value);

								if (typeof value !== 'number') {
									//not a number, then it's a variable id
									if (command.performVariableSubstitution) {
										value = variables[value];
									}
								}
							}

							parameters.push(value);
						}
					}
				}
			}

			//skip non-command lines, if command is undefined there were no matches
			if (typeof command !== undefType) {
				ret = command.run(parameters);
			}
		}

		return ret;
	}

	/**
	 * @private
	 *
	 * Processes multiple lines or an entire Jaysic script
	 *
	 * @param {String} source The script to process
	 */
	function processScript(source) {
		//split the script into lines
		var line,
			x,
			y;

		lines = source.split("\n");
		linesCounter = 0;

		//process each line
		for (x = 0, y = lines.length; x < y; x += 1) {
			linesCounter = x + 1;
			line = lines[x];

			if (line.length > 0) {
				processLine(lines[x]);
			}
		}

		lines = null;
		linesCounter = undefined;
	}

	/**
	 * @private
	 *
	 * Finds all the scripts with type text/jaysic in the page and executes them in
	 * order of appearance in the DOM
	 */
	function processPageScripts() {
		//slashes need to be escaped in a CSS selector
		var scripts = document.querySelectorAll('script[type=' + scriptType.replace('/', '\\/') + ']'),
			x,
			y;

		for (x = 0, y = scripts.length; x < y; x += 1) {
			processScript(scripts[x].innerHTML);
		}
	}

	/**
	 * @private
	 *
	 * module definition
	 */
	function jaysic() {
		return {
			getCurrentLineNumber: getCurrentLineNumber,
			execute: processScript,
			registerCommand: registerCommand
		};
	}

	//process jaysic script tags in the page when DOM is ready
	if (document && document.addEventListener) {
		//DOMContentLoaded is supported by all the modern browsers, including Internet Explorer 9.0
		document.addEventListener('DOMContentLoaded', processPageScripts, false);
	}

	//UMD definitions
	if (typeof define === 'function' && define.amd) {
		//AMD module
		define('jaysic', jaysic);
	} else if (typeof module === 'object' && module.exports) {
		//CommonJS module
		module.exports = jaysic();
	} else {
		//traditional namespace
		context.Jaysic = jaysic();
	}
}(this));