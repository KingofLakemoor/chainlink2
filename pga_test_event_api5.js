async function test() {
  const url = `http://site.api.espn.com/apis/common/v3/sports/golf/pga/athletes/10054`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();
     console.log("Athlete internal keys:", Object.keys(athData.athlete));
     console.log("Athlete links:", athData.links);
  } catch(e) {
      console.log(e.message)
  }
}
test();
