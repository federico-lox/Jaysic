/**
 * Jaysic intepreter
 *
 * @author Federico "Lox" Lucignano <http://plus.ly/federico.lox>
 */

/*global define, module, console*/
(function (context) {
	'use strict';

	var commands = {},
		variables = {},
		//identifies each component in a statement like COMMAND PAR1 PAR2 "PAR3"
		commandStatementRegEx = new RegExp('([\\w\\.]+|"([^"]*)")', 'ig'),
		//anything after a @@@ combination will be ignored if not wrapped in a string, e.g. "@@@ this is not a comment"
		commentRegEx = new RegExp('[^"](@{3}.*)[^"]$', 'ig'),
		scriptType = 'text/jaysic',
		document = context.document,
		//help minification
		undefType = 'undefined';

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
		//DEBUG
		console.log(this.implementation.apply(variables, parameters));
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
	 * Processes a single line in a Jaysic script
	 *
	 * @param {String} source A single line of Jaysic
	 */
	function processLine(source) {
		var command,
			match,
			parameters = [],
			value,
			varValue;

		//reset RegExp status
		commandStatementRegEx.lastIndex = 0;

		//TODO: implement sub-statements, e.g. SET X (SUM Y Z)
		while (match = commandStatementRegEx.exec(source)) {
			if (!command) {
				//TODO: check if the command is registered and in case throw an undefined command error
				command = commands[match[1]];

			} else {
				//if it's a string then use the submatch at index 2 otherwise the plain value at index1
				if (typeof match[2] !== undefType) {
					value = match[2];
				} else {
					//not a string, check if it's a variable identifier and in case fetch the value
					value = match[1];

					if (command.performVariableSubstitution) {
						varValue = variables[value];
					}

					if (typeof varValue !== undefType) {
						value = varValue;
					}
				}

				parameters.push(value);
			}
		}

		//skip empty lines, if command is undefined there were no matches
		if (typeof command !== undefType) {
			command.run(parameters);
		}
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
		var lines = source.split("\n"),
			x,
			y;

		//process each line
		for (x = 0, y = lines.length; x < y; x += 1) {
			processLine(lines[x].replace(commentRegEx, ''));
		}
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
			execute: processScript,
			registerCommand: registerCommand
		};
	}

	//process jaysic script tags in the page when DOM is ready
	if (document && document.addEventListener) {
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