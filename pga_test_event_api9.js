async function test() {
  const url = `https://site.api.espn.com/apis/site/v2/sports/golf/leaderboard?league=pga`;
  try {
     const athRes = await fetch(url);
     const athData = await athRes.json();

     const course = athData.events[0].courses;
     console.log("Course from leaderboard:", course ? course.length : "None");
     if (course && course.length > 0) console.log("Holes info keys:", Object.keys(course[0]));
     if (course && course.length > 0 && course[0].holes) {
         console.log(course[0].holes[0]);
     }
  } catch(e) {
      console.log(e.message)
  }
}
test();
