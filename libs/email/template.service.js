import fs from "fs";
import path from "path";
import handlebars from "handlebars";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));

export const renderTemplate = async (templateName, context) => {
  const templatePath = path.join(__dirname, `templates/${templateName}.hbs`);

  const source = fs.readFileSync(templatePath, "utf8");
  const template = handlebars.compile(source);
  return template(context);
};
