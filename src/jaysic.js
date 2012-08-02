/**
 * Jaysic intepreter
 *
 * @author Federico "Lox" Lucignano <http://plus.ly/federico.lox>
 */

/*global define, module, console*/
(function (context) {
	'use strict';
	/**
	 * TODO: parsing context (regex statuses, lines, variables, etc) shouldn't be global
	 * as more than one interpreter can exist and more than one call to execute
	 * can be running asynchronously
	 */

	 /**
	 * TODO: introduce a boolean type using yes and no
	 */

	//e.g. print or x
	var identifierPattern = '[^\'\\(\\)\\s\\.]+',
		//e.g. //comment text
		//anything after a // sequence will be ignored
		//till the end of the line if not wrapped in
		//a string, e.g. '//this is not a comment'
		commentPattern = '([^\']*/{2}[^\']*)',
		//e.g. 0.7 or .5
		floatPattern = '[-+]?\\d*\\.\\d+',
		//e.g. training spaces or tabs on a line
		indentationPatter = '(?:^\\s+|\\s$)',
		//e.g. 6
		integerPattern = '[-+]?\\d+',
		//e.g. 1.4 or 9
		numberPattern = '[-+]?\\d*\\.?\\d+',
		//e.g. x or 'string text' or 5 or (print 'hello')
		parameterPattern = '[\\S]+',
		//e.g. 'this is a string and this it''s an escaped quote'
		stringPattern = "'('{2}|[^'])*'",
		//e.g. (sum 5 3)
		subCommandPatternInner = '\\([^\\(\\)]*\\)',
		//e.g. (print (subtract (sum 5 3) 7))
		subCommandPatternOuter = '\\(.*\\)',
		//e.g. COMMAND PAR1 PAR2 "PAR3" (SUBCOMMAND ...)
		statementRegEx = new RegExp(
			'^\\s*(' + identifierPattern + ')((?:\\s(?:'
				+ parameterPattern + '))*)\\s*$',
			'g'
		),
		//e.g. PAR1 PAR2 'PAR3' (SUBCOMMAND ...)
		paramRegEx = new RegExp(
			'(' + identifierPattern + '|' + numberPattern + '|' + stringPattern +
				'|' + subCommandPatternOuter + ')',
			'g'
		),
		identifierRegEx = new RegExp('^' + identifierPattern + '$', 'g'),
		commentRegEx = new RegExp(commentPattern + '$', 'g'),
		floatRegEx = new RegExp('^' + floatPattern + '$', 'g'),
		indentationRegEx = new RegExp(indentationPatter, 'g'),
		integerRegEx = new RegExp('^' + integerPattern + '$', 'g'),
		stringRegEx = new RegExp('^' + stringPattern + '$', 'g'),
		subCommandRegEx = new RegExp(subCommandPatternInner, 'g'),
		commandChain = [],
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
		this.performVariableSubstitution = (typeof variableSubstitution === undefType) ?
				true :
				variableSubstitution;
	}

	Command.prototype.run = function (parameters) {
		//DEBUG
		console.log('[Jaysic]', this.id, parameters);
		return this.implementation.apply(variables, parameters);
	};

	/**
	 * @public
	 *
	 * Registers a command and makes it available in scripts
	 *
	 * @param {String} commandId The identifier for the command
	 * @param {Function} implementation The actual implementation
	 * for the command as a function
	 */
	function registerCommand(commandId, implementation, variableSubstitution) {
		commands[commandId] = new Command(commandId, implementation, variableSubstitution);
	}

	function getCurrentCommand() {
		return (commandChain.length) ? commandChain[commandChain.length - 1] : undefined;
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
	 * checks if the token represents a sub-command
	 *
	 * @param {String} token The token to test
	 * @returns {bool} true if the token is a sub-command, false otherwise
	 */
	function isSubCommand(token) {
		//reset global RegExp status
		subCommandRegEx.lastIndex = 0;
		return subCommandRegEx.test(token);
	}

	/**
	 * @private
	 *
	 * checks if the token represents a command or variable identifier
	 *
	 * @param {String} token The token to test
	 * @returns {bool} true if the token is an identifier, false otherwise
	 */
	function isIdentifier(token) {
		//reset global RegExp status
		identifierRegEx.lastIndex = 0;
		return identifierRegEx.test(token);
	}

	/**
	 * @private
	 *
	 * checks if the token represents a string
	 *
	 * @param {String} token The token to test
	 * @returns {bool} true if the token is a string, false otherwise
	 */
	function isString(token) {
		//reset global RegExp status
		stringRegEx.lastIndex = 0;
		return stringRegEx.test(token);
	}

	/**
	 * @private
	 *
	 * checks if the token represents a number of integer type
	 *
	 * @param {mixed} token The token to test
	 * @returns {bool} true if the token is an integer, false otherwise
	 */
	function isInteger(token) {
		//reset global RegExp status
		integerRegEx.lastIndex = 0;
		return integerRegEx.test(token);
	}

	/**
	 * @private
	 *
	 * checks if the token represents a number of floating point type
	 *
	 * @param {mixed} token The token to test
	 * @returns {bool} true if the token is a floating point number, false otherwise
	 */
	function isFloat(token) {
		//reset global RegExp status
		floatRegEx.lastIndex = 0;
		return floatRegEx.test(token);
	}

	/**
	 * @private
	 *
	 * Process a string token
	 *
	 * @param {String} token The token to process
	 * @returns {String} the internal value for the token
	 */
	function processSubCommand(token) {
		//reset global RegExp status
		subCommandRegEx.lastIndex = 0;
		var subCommand,
			subToken;

		while (subCommand = subCommandRegEx.exec(token)) {
			subToken = subCommand[0];
			subToken = processLine(subToken.substring(1, subToken.length - 1));

			//TODO: this is just text replacement,
			//it won't work with array and object references
			//switch to a table of symbols
			token = token.replace(subCommand[0], subToken);

			//reset global RegExp status
			subCommandRegEx.lastIndex = 0;
			commandChain.pop();
		}

		//needs to be re-analyzed since it has been generated by other commands
		//and could be a wrapped string or a stringified number or variable
		//identifier
		return analyzeToken(token);
	}

	/**
	 * @private
	 *
	 * Process a string token
	 *
	 * @param {String} token The token to process
	 * @returns {String} the internal value for the token
	 */
	function processString(token) {
		//exclude the wrapping single quotes
		//and replace double single quote as
		//an escape sequence for single quote
		return token.substring(1, token.length - 1).replace("''", "'");
	}

	/**
	 * @private
	 *
	 * Process an integer number token
	 *
	 * @param {mixed} token The token to process
	 * @returns {integer} the internal value for the token
	 */
	function processInteger(token) {
		//~~ converts any type always to an integer (0 in case of failure)
		//this is the desired behavior for Jaysic
		//while parseInt would return NaN for failure
		return ~~token;
	}

	/**
	 * @private
	 *
	 * Process a floating point number token
	 *
	 * @param {mixed} token The token to process
	 * @returns {float} the internal value for the token
	 */
	function processFloat(token) {
		return parseFloat(token);
	}

	function analyzeToken(token) {
		var value;

		if (isString(token)) {
			//strings go first since they can actually
			//contain any of the other token types
			value = processString(token);
		} else if (isSubCommand(token)) {
			//then subcommands since they can also contain
			//other token types
			value = processSubCommand(token);
		} else if (isInteger(token)) {
			value = processInteger(token);
		} else if (isFloat(token)) {
			value = processFloat(token);
		} else if (isIdentifier(token)) {
			//this is a variable identifier
			//look up the value or fail
			if (getCurrentCommand().performVariableSubstitution) {
				value = variables[token];

				if (typeof value === undefType) {
					//TODO: switch to a custom error object able to handle
					//the line number and print the code from lineNum-2 to lineNum+2
					throw '[Jaysic] Unknown variable "' + token +
						'" at line ' + getCurrentLineNumber() + "\n>" +
						getCurrentLine();
				}
			} else {
				value = token;
			}
		} else {
			//TODO: switch to a custom error object able to handle
			//the line number and print the code from lineNum-2 to lineNum+2
			throw '[Jaysic] Invalid token "' + token +
				'" at line ' + getCurrentLineNumber() + "\n>" +
				getCurrentLine();
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
		var cmd,
			commandId,
			token,
			tokens,
			parameters = [],
			paramString,
			paramTokens,
			ret,
			subMatch,
			subValue,
			value,
			x,
			y;

		//purge line from comment statements and trailing spaces
		line = line.replace(commentRegEx, '').replace(indentationRegEx, '');

		//if it wasn't a line containing only comments
		if (line.length > 0) {
			//reset global RegExp status
			statementRegEx.lastIndex = 0;
			tokens = statementRegEx.exec(line);
			cmd = null;

			if (tokens instanceof Array && tokens.length > 1) {
				commandId = tokens[1].toLowerCase();
				cmd = commands[commandId];
				paramString = tokens[2];

				if (!cmd) {
					//TODO: switch to a custom error object able to handle
					//the line number and print the code from lineNum-2 to lineNum+2
					throw '[Jaysic] Unknown command "' + commandId +
						'" at line ' + getCurrentLineNumber() + "\n>" +
						getCurrentLine();
				} else {
					commandChain.push(cmd);
					paramTokens = paramString.match(paramRegEx);

					if (paramTokens instanceof Array && paramTokens.length > 0) {
						for (x = 0, y = paramTokens.length; x < y; x += 1) {
							parameters.push(analyzeToken(paramTokens[x]));
						}
					}
				}
			}

			//skip non-command lines, if command
			//is undefined or null there were no matches
			if (cmd) {
				ret = cmd.run(parameters);
			} else {
				//TODO: switch to a custom error object able to handle
				//the line number and print the code from lineNum-2 to lineNum+2
				throw '[Jaysic] Invalid line encountere at line ' +
					getCurrentLineNumber() + "\n>" + getCurrentLine();
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
			processLine(lines[x]);
		}

		lines = null;
		linesCounter = undefined;
	}

	/**
	 * @private
	 *
	 * Finds all the scripts with type text/jaysic in the page and executes them
	 * in order of appearance in the DOM
	 */
	function processPageScripts() {
		//slashes need to be escaped in a CSS selector
		var scripts = document.querySelectorAll(
				'script[type=' + scriptType.replace('/', '\\/') + ']'
			),
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
		//DOMContentLoaded is supported by all the modern browsers,
		//including Internet Explorer 9.0
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