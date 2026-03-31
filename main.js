const http = require('http');
const fs = require('fs');
const { Command } = require('commander');
const { XMLBuilder } = require('fast-xml-parser');

const program = new Command();

program
  .requiredOption('-i, --input <path>', 'Input file')
  .requiredOption('-h, --host <host>', 'Host')
  .requiredOption('-p, --port <port>', 'Port');

program.parse(process.argv);

const options = program.opts();

// Перевірка файлу
if (!fs.existsSync(options.input)) {
  console.error("Cannot find input file");
  process.exit(1);
}

const server = http.createServer((req, res) => {
  fs.readFile(options.input, 'utf-8', (err, data) => {
    if (err) {
      res.writeHead(500);
      return res.end("Error reading file");
    }

    try {
      const jsonData = JSON.parse(data);

      const url = new URL(req.url, `http://${options.host}:${options.port}`);
      const mfo = url.searchParams.get('mfo');
      const normal = url.searchParams.get('normal');

      let banks = jsonData;

      if (jsonData.banks) {
        banks = jsonData.banks;
      }

      // Фільтр normal
      if (normal === 'true') {
        banks = banks.filter(bank => bank.COD_STATE == 1);
      }

      const result = {
        banks: {
          bank: banks.map(bank => {
            let obj = {
              name: bank.NAME,
              state_code: bank.COD_STATE
            };

            if (mfo === 'true') {
              obj.mfo_code = bank.MFO;
            }

            return obj;
          })
        }
      };

      const builder = new XMLBuilder();
      const xml = builder.build(result);

      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(xml);

    } catch (e) {
      res.writeHead(500);
      res.end("Invalid JSON");
    }
  });
});

server.listen(options.port, options.host, () => {
  console.log(`Server running at http://${options.host}:${options.port}`);
});