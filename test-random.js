function getMonthlyItems(items, type, count, typeSeed) {
    const date = new Date();
    const seed = date.getFullYear() * 100 + date.getMonth(); // 202405

    const seededRandom = (s) => {
      return function() {
        s = Math.sin(s) * 10000;
        return s - Math.floor(s);
      };
    };

    const random = seededRandom(seed + typeSeed);
    const shuffled = [...items].sort((a, b) => a.id.localeCompare(b.id));
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled.slice(0, count);
}

const arr = [{id:'a'}, {id:'b'}, {id:'c'}, {id:'d'}, {id:'e'}, {id:'f'}, {id:'g'}];
console.log(getMonthlyItems(arr, 'TITLE', 3, 1));
