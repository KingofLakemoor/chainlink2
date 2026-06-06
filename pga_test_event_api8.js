async function test() {
  const url = `http://site.api.espn.com/apis/site/v2/sports/golf/pga/scoreboard`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();

     const course = athData.events[0].courses;
     console.log("Course:", course ? course.length : "None");
     if (course) console.log(JSON.stringify(course, null, 2));
  } catch(e) {
      console.log(e.message)
  }
}
test();
