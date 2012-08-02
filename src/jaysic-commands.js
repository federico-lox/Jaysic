/**
 * Jaysic intepreter basic commands
 *
 * @author Federico "Lox" Lucignano <http://plus.ly/federico.lox>
 */

/*global require, define, module, console*/
(function (context) {
	'use strict';

	/**
	 * @private
	 *
	 * Module definition
	 */
	function jaysicCommands(jaysic) {
		//variable management
		jaysic.registerCommand('set', function (identifier, value) {
			this[identifier] = value;
			return value;
		}, false);

		jaysic.registerCommand('unset', function (identifier) {
			var ret = false;

			if (typeof this[identifier] !== 'undefined') {
				delete this[identifier];
				ret = true;
			}

			return ret;
		}, false);

		//input/output
		jaysic.registerCommand('print', function () {
			//since console.log.apply is an illegal invokation just concatenate all the values as a string
			console.log(Array.prototype.join.call(arguments, ' ').replace('&apos;', "'"));
		});

		//Math
		jaysic.registerCommand('sum', function () {
			var total = 0,
				value,
				x,
				y;

			for (x = 0, y = arguments.length; x < y; x += 1) {
				value = arguments[x];

				//~~ converts any type always to a number (0 in case of utter failure)
				//this is the desired behavior for Jaysic (parseInt would return NaN for failure)
				total += (typeof value === 'number') ? value : ~~value;
			}

			return total;
		});

		jaysic.registerCommand('subtract', function () {
			var total,
				value,
				x,
				y;

			for (x = 0, y = arguments.length; x < y; x += 1) {
				value = arguments[x];
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