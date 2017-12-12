/* --------
   Utils.ts

   Utility functions.
   -------- */

module TSOS {

    export class Utils {

        public static trim(str: string): string {
            // Use a regular expression to remove leading and trailing spaces.
            return str.replace(/^\s+ | \s+$/g, "");
            /*
            Huh? WTF? Okay... take a breath. Here we go:
            - The "|" separates this into two expressions, as in A or B.
            - "^\s+" matches a sequence of one or more whitespace characters at the beginning of a string.
            - "\s+$" is the same thing, but at the end of the string.
            - "g" makes is global, so we get all the whitespace.
            - "" is nothing, which is what we replace the whitespace with.
            */
        }

        public static trimProgramArray(arr: number[]): number[] {
            var firstZero = arr.length - 1; // Assume first 0 at end of array
            while (firstZero > 0) {
                if (arr[firstZero - 1] === 0) { // Adjust for each 0 found
                    firstZero -= 1;
                } else {
                    break; // Found program content (non-zero)
                }
            }
            return arr.slice(0, firstZero + 1); // Return portion to first 0
        }

        public static rot13(str: string): string {
            /*
               This is an easy-to understand implementation of the famous and common Rot13 obfuscator.
               You can do this in three lines with a complex regular expression, but I'd have
               trouble explaining it in the future.  There's a lot to be said for obvious code.
            */
            var retVal: string = "";
            for (var i in <any>str) {    // We need to cast the string to any for use in the for...in construct.
                var ch: string = str[i];
                var code: number = 0;
                if ("abcedfghijklmABCDEFGHIJKLM".indexOf(ch) >= 0) {
                    code = str.charCodeAt(Number(i)) + 13;  // It's okay to use 13.  It's not a magic number, it's called rot13.
                    retVal = retVal + String.fromCharCode(code);
                } else if ("nopqrstuvwxyzNOPQRSTUVWXYZ".indexOf(ch) >= 0) {
                    code = str.charCodeAt(Number(i)) - 13;  // It's okay to use 13.  See above.
                    retVal = retVal + String.fromCharCode(code);
                } else {
                    retVal = retVal + ch;
                }
            }
            return retVal;
        }

        public static toHex(num: number, digits: number = 2): string {
            return ("0".repeat(digits) + num.toString(16).toUpperCase()).slice(-digits);
        }

        public static fromHex(hexString: string): number {
            return parseInt(hexString, 16);
        }

        public static toHexArray(str: string): number[] {
            var strArray = str.split("");
            return strArray.map(x => x.charCodeAt(0));
        }

        public static fromHexArray(hexArray: number[]): string {
            var hexData = hexArray.map(x => String.fromCharCode(x));
            var dataString = hexData.join("");
            return dataString.replace(/\0/g, "");
        }

    }

}
