/**
 * Jaysic intepreter basic commands
 *
 * @author Federico "Lox" Lucignano <http://plus.ly/federico.lox>
 */

/*global require, define, module, console*/
(function (context) {
	'use strict';

	var intRegEx = new RegExp('^\\d+$', 'g'),
		floatRegEx = new RegExp('^\\d*\\.\\d+$', 'g');

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
		intRegEx.lastIndex = floatRegEx.lastIndex = 0;

		if (typeof value === 'string') {
			if (intRegEx.test(value)) {
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
	 * Module definition
	 */
	function jaysicCommands(jaysic) {
		//variable management
		jaysic.registerCommand('SET', function (identifier, value) {
			this[identifier] = processNumbers(value);
			return value;
		}, false);

		jaysic.registerCommand('UNSET', function (identifier) {
			var ret = false;

			if (typeof this[identifier] !== 'undefined') {
				delete this[identifier];
				ret = true;
			}

			return ret;
		}, false);

		//input/output
		jaysic.registerCommand('PRINT', function () {
			//since console.log.apply is an illegal invokation just concatenate all the values as a string
			console.log(Array.prototype.join.call(arguments, ' '));
		});

		//Math
		jaysic.registerCommand('SUM', function () {
			var total = 0,
				value,
				x,
				y;

			for (x = 0, y = arguments.length; x < y; x += 1) {
				value = processNumbers(arguments[x]);

				//~~ converts any type always to a number (0 in case of utter failure)
				//this is the desired behavior for Jaysic (parseInt would return NaN for failure)
				total += (typeof value === 'number') ? value : ~~value;
			}

			return total;
		});

		jaysic.registerCommand('SUBTRACT', function () {
			var total,
				value,
				x,
				y;

			for (x = 0, y = arguments.length; x < y; x += 1) {
				value = processNumbers(arguments[x]);
				//~~ converts any type always to a number (0 in case of utter failure)
				//this is the desired behavior for Jaysic (parseInt would return NaN for failure)
				value = (typeof value === 'number') ? value : ~~value;

				if (typeof total === 'undefined') {
					total = value;
				} else {
					total -= value;
				}
			}

			return total;
		});
	}

	//UMD
	if (typeof define === 'function' && define.amd) {
		//AMD module
		define('jaysic-commands', ['jaysic'], jaysicCommands);
	} else if (typeof module === 'object' && module.exports) {
		//CommonJS module
		jaysicCommands(require('jaysic'));
	} else {
		//traditional namespace
		jaysicCommands(context.Jaysic);
	}
}(this));