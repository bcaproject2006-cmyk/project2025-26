require("dotenv").config();
const { neon } = require("@neondatabase/serverless");

const sql = neon(process.env.DATABASE_URL);

const toPgPlaceholders = (text) => {
    let index = 1;
    return text.replace(/\?/g, () => `$${index++}`);
};

const mysqlToPostgresSql = (text) => {
    let sqlText = text;

    sqlText = sqlText.replace(/\bCURDATE\(\)/gi, "CURRENT_DATE");
    sqlText = sqlText.replace(/\bNOW\(\)/gi, "CURRENT_TIMESTAMP");
    sqlText = sqlText.replace(/\bYEARWEEK\(\s*([^,]+?)\s*,\s*1\s*\)/gi, "CAST(TO_CHAR($1, 'IYYYIW') AS INTEGER)");
    sqlText = sqlText.replace(/\bYEAR\(\s*([^\)]+?)\s*\)/gi, "EXTRACT(YEAR FROM $1)");
    sqlText = sqlText.replace(/\bMONTH\(\s*([^\)]+?)\s*\)/gi, "EXTRACT(MONTH FROM $1)");

    sqlText = sqlText.replace(
        /\bDATE_ADD\(\s*CURRENT_DATE\s*,\s*INTERVAL\s+(\?|\d+)\s+(DAY|WEEK|MONTH|YEAR)\s*\)/gi,
        "(CURRENT_DATE + (($1)::int * INTERVAL '1 $2'))"
    );
    sqlText = sqlText.replace(
        /\bDATE_SUB\(\s*CURRENT_DATE\s*,\s*INTERVAL\s+(\?|\d+)\s+(DAY|WEEK|MONTH|YEAR)\s*\)/gi,
        "(CURRENT_DATE - (($1)::int * INTERVAL '1 $2'))"
    );

    return sqlText;
};

const firstKeyword = (text) => {
    const cleaned = text.trim().replace(/^\(+/, "");
    const match = cleaned.match(/^([a-zA-Z]+)/);
    return match ? match[1].toUpperCase() : "";
};

const extractInsertId = (row) => {
    if (!row || typeof row !== "object") return undefined;

    if (Object.prototype.hasOwnProperty.call(row, "id")) return row.id;

    for (const key of Object.keys(row)) {
        if (key.toLowerCase().endsWith("_id")) return row[key];
    }

    return undefined;
};

class NeonMysqlCompat {
    async _execute(rawText, params = []) {
        const kind = firstKeyword(rawText);
        let text = mysqlToPostgresSql(rawText);
        text = toPgPlaceholders(text);

        if ((kind === "INSERT" || kind === "UPDATE" || kind === "DELETE") && !/\bRETURNING\b/i.test(text)) {
            text = `${text} RETURNING *`;
        }

        const result = await sql.query(text, params);
        const rows = Array.isArray(result) ? result : [];

        if (kind === "SELECT" || kind === "SHOW" || kind === "WITH") {
            return { kind, rows, mysqlResult: rows };
        }

        if (kind === "INSERT") {
            return {
                kind,
                rows,
                mysqlResult: {
                    affectedRows: rows.length,
                    insertId: extractInsertId(rows[0]),
                    rowCount: rows.length
                }
            };
        }

        return {
            kind,
            rows,
            mysqlResult: {
                affectedRows: rows.length,
                rowCount: rows.length
            }
        };
    }

    query(text, params = [], callback) {
        if (typeof params === "function") {
            callback = params;
            params = [];
        }

        const runner = this._execute(text, params).then((out) => out.mysqlResult);

        if (typeof callback === "function") {
            runner.then((value) => callback(null, value)).catch((err) => callback(err));
            return;
        }

        return runner;
    }

    promise() {
        return {
            query: async (text, params = []) => {
                const out = await this._execute(text, params);
                return [out.mysqlResult, []];
            }
        };
    }

    connect(callback) {
        if (typeof callback === "function") {
            callback(null);
        }
    }
}

module.exports = new NeonMysqlCompat();