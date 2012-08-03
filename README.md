Jaysic
======

Jaysic is a simple scripting language running on a compact, platform-agnostic interpreter built in pure JavaScript.


Overview and rationale
----------------------

Jaysic started as a personal exercise of style during one of the WikiaDays at [Wikia](http://www.wikia.com)'s office in
Poznań (Poland) but quickly evolved into a simple yet flexible scripting language.

The interpreter can run in any JavaScript-enabled environment, from **browsers** to **mobile apps**, and it's easy to
extend and embed into existing projects while the syntax it's very simple and has been designed to be easy to type also
on devices with limited keyboards such as **tablets** and **smartphones**.

Jaysic can be used in many different ways, including:
*	Turning an app or website into an easy-to-customize experience for users by allowing for things like scriptable
	events, custom toolbars, equations
*	Allow modding for HTML5 video games
*	Teaching (or learning) computer programming on any kind of hardware (what about you or your child learning how to
	program on an iPad?) thanks to the simplified syntax and strict, clear rules


The interpreter
---------------

Jaysic's interpreter is written in pure JavaScript and can run virtually in any JavaScript-capable environment, at the
moment this is a list of directly supported platforms:

*	Ecmascript5-compatible web browsers (Chrome 1+, Firefox 3.6+, Internet Explorer 9.0+, Opera 10+, BlackBerry 9.x+,
	Android 2.x+, iOS 3.x+)
*	[NodeJS](http://nodejs.org)
*	[PhantomJS](http://phantomjs.org)
*	[Appcelerator Titanium](http://www.appcelerator.com)
*	[Adobe PhoneGap/Apache Cordova](http://incubator.apache.org/cordova)

The interpreter's core is **less than 2KB** once minified and compressed with GZip and It has been designed as a
[UMD module](https://github.com/umdjs/umd), as such it's fully compatible with AMD, CommonJS and traditional
namespaces patterns; the size and compatibility makes it very easy to embed Jaysic in existing projects.

The interpreter process Jaysic scripts managing a symbol table for ***variables*** and running pre-compiled ***commands***
written in JavaScript; the execution context is a sealed sandbox, this means that scripts have no direct access to the
hosting environments making Jaysic pretty safe to use in your projects (e.g. there is no way for a user to brake or
modify the behaviour of your product), access to additional *"native"* functionality can be added only by creating
and registering new ***commands***.

**More on creating and registering new commands will be added soon**


The scripting language
----------------------

Jaysic's syntax is partially inspired by the old *BASIC* language and it's simplicity
(hence the name, a combination of JS and BASIC which became J-SIC or simply Jaysic) and it
borrows some interesting concepts from Python and JavaScript as well.

Due to its' ancestry any editor capable of highlighting JavaScript or Python source code can do it for Jaysic as well
with no need of plugins (YAY!).

A statement in Jaysic is, in it's simplest form, just a command invokation followed by any
number of required parameters all separated by spaces, e.g.:

```
print 'Hello world!'
```

The line above will invoke the *print* command passing the string *Hello World!* as a parameter;
pretty easy, isn't it?

Commands can accept the result of other commands (then caled ***sub-commands***) as a parameter, this allow for any
kind of combination and it's achieved by wrapping a sub-command in a ***sub-context*** using parenthesis, e.g.:

```
print 'The result of 5 + 6 is:' (sum (subtract 9 4) 6)
```

Sub-contexts are resolved from the innermost to the outernmost, so the above will first subtract 4 from 9 (i.e. 5) and
then the result will be used as the first parameter of the sum command which in its' turn will be used as the second
paramenter for the print command which will output *The result of 5 + 6 is: 11)*.

**More on the language's syntax will be added soon**


Credits
-------

*	[Federico "Lox" Lucignano](http://plus.ly/federico.lox "Google profile"), creator and mantainer
*	All the [contributors](http://github.com/federico-lox/Jaysic/contributors "Jaysic contributors at GitHub")