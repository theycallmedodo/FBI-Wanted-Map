const baseUrl = 'https://api.fbi.gov/wanted/v1/list';
let allPersons = [];

main();

async function main() {
  const pages = await calculatePages(baseUrl);
  await collectAllWanted(baseUrl, pages);
  console.log("gotowe dane:", allPersons);
  // te dane mozna zapisac pozniej do db
  exportToJsonFile(allPersons);
}

function delay(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

async function calculatePages(url) {
    console.log("calculate pages");
    const response = await fetch(url);
    const data = await response.json();
    const total = data.total;
    const pageSize = data.items.length;
    const pages = Math.ceil(total/pageSize);
    return pages;
}

async function collectAllWanted(url, totalPages) {
     for (let i = 1; i <= totalPages; i++) {
    const url = `${baseUrl}?page=${i}`;
    const res = await fetch(url);
    const data = await res.json();

    const filtered = data.items.map(person => ({
      uid: person.uid,
      url: person.url || '',
      title: person.title || '',
      race: person.race || 'Unknown',
      age: person.age_range || 'Unknown',
      field_offices: person.field_offices || 'Unknown'
    }));

    console.log(JSON.stringify(filtered));

    allPersons.push(...filtered);
    console.log(`strona ${i} – osób dodanych: ${filtered.length}`);
    await delay(2000); // przerwa, żeby nie zajechać api
    }

}

function exportToJsonFile(data) {
  const fileName = "dbtest.json";
  const json = JSON.stringify(data, null, 2);
  const blob = new Blob([json], { type: "application/json" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = fileName;
  a.click();

  URL.revokeObjectURL(url);
}