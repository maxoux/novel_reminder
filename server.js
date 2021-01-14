const { writeFileSync } = require("fs");
var sass = require("sass");
var watch = require('node-watch');
const { exec } = require("child_process");

function compileScss() {
    sass.render({file: "novel_reminder.scss"}, function(err, result) { 
        if (err)
            return console.error("Error while compiling sass : ", err);
        
        writeFileSync("style.css", result.css);
        console.log("SCSS compiled.")
    });
}

compileScss();
watch('novel_reminder.scss', compileScss);
console.log("Watching for changes...");

exec("npx http-server -c0", (err, out, stdErr) => {
    if (out)
        console.log(out);
    if (stdErr)
        console.log(stdErr)
    if (err)
        console.log(err);
});

console.log("Server listening on http://localhost:8080/ !")
