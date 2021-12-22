const moment = require('moment');
const path = require('path');
const fs = require('fs');
const fetch = require('node-fetch');
const { Util: DiscordUtil } = require('discord.js');

class Util {

    constructor () {
        throw new Error("Class may not be instantiated.");
    }

    static paginate (items, page = 1, pageLength = 10) {
        const maxPage = Math.ceil(items.length / pageLength);
        if (page < 1) page = 1;
        if (page > maxPage) page = maxPage;
        const startIndex = (page - 1) * pageLength;
        return {
            items: items.length > pageLength ? items.slice(startIndex, startIndex + pageLength) : items,
            page,
            maxPage,
            pageLength
        };
    }

    static arrayIncludesAny (target, compareTo = []) {

        if (!(compareTo instanceof Array)) compareTo = [ compareTo ];
        for (const elem of compareTo) {
            if (target.includes(elem)) return true;
        }
        return false;

    }

    static downloadAsBuffer (source) {
        return new Promise((resolve, reject) => {
            fetch(source).then((res) => {
                if (res.ok) resolve(res.buffer());
                else reject(res.statusText);
            });
        });
    }

    static readdirRecursive (directory) {

        const result = [];

        // eslint-disable-next-line no-shadow
        (function read (directory) {
            const files = fs.readdirSync(directory);
            for (const file of files) {
                const filePath = path.join(directory, file);

                if (fs.statSync(filePath).isDirectory()) {
                    read(filePath);
                } else {
                    result.push(filePath);
                }
            }
        }(directory));

        return result;

    }

    static wait (ms) {
        return this.delayFor(ms);
    }

    static delayFor (ms) {
        return new Promise((resolve) => {
            setTimeout(resolve, ms);
        });
    }

    static escapeMarkdown (text, options) {
        if (typeof text !== 'string') return text;
        return DiscordUtil.escapeMarkdown(text, options);
    }

    static get formattingPatterns () {
        return [
            [ '\\*{1,3}([^*]*)\\*{1,3}', '$1' ],
            [ '_{1,3}([^_]*)_{1,3}', '$1' ],
            [ '`{1,3}([^`]*)`{1,3}', '$1' ],
            [ '~~([^~])~~', '$1' ]
        ];
    }

    static removeMarkdown (content) {
        if (!content) throw new Error('Missing content');
        this.formattingPatterns.forEach(([ pattern, replacer ]) => {
            content = content.replace(new RegExp(pattern, 'gu'), replacer);
        });
        return content.trim();
    }

    /**
     * Sanitise user given regex; escapes unauthorised characters
     *
     * @static
     * @param {string} input
     * @param {string[]} [allowed=['?', '\\', '(', ')', '|']]
     * @return {string} The sanitised expression
     * @memberof Util
     */
    static sanitiseRegex (input, allowed = [ '?', '\\', '(', ')', '|' ]) {
        if (!input) throw new Error('Missing input');
        const reg = new RegExp(`[${this.regChars.filter((char) => !allowed.includes(char)).join('')}]`, 'gu');
        return input.replace(reg, '\\$&');
    }

    static get regChars () {
        return [ '.', '+', '*', '?', '\\[', '\\]', '^', '$', '(', ')', '{', '}', '|', '\\\\', '-' ];
    }

    static escapeRegex (string) {
        if (typeof string !== 'string') {
            throw new Error("Invalid type sent to escapeRegex.");
        }

        return string
            .replace(/[|\\{}()[\]^$+*?.]/gu, '\\$&')
            .replace(/-/gu, '\\x2d');
    }

    static duration (seconds) {
        const { plural } = this;
        let s = 0,
            m = 0,
            h = 0,
            d = 0,
            w = 0;
        s = Math.floor(seconds);
        m = Math.floor(s / 60);
        s %= 60;
        h = Math.floor(m / 60);
        m %= 60;
        d = Math.floor(h / 24);
        h %= 24;
        w = Math.floor(d / 7);
        d %= 7;
        return `${w ? `${w} ${plural(w, 'week')} ` : ''}${d ? `${d} ${plural(d, 'day')} ` : ''}${h ? `${h} ${plural(h, 'hour')} ` : ''}${m ? `${m} ${plural(m, 'minute')} ` : ''}${s ? `${s} ${plural(s, 'second')} ` : ''}`.trim();
    }

    static plural (amt, word) {
        if (amt === 1) return word;
        return `${word}s`;
    }

    static get date () {
        return moment().format("YYYY-MM-DD HH:mm:ss");
    }

}

module.exports = Util;