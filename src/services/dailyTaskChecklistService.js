import DailyTaskChecklist from "../models/dailyTaskChecklist.js";
import DailyTask from "../models/dailyTasks.js";

// Deterministic random seeded by date
function seededRandom(seed) {
  const x = Math.sin(seed) * 10000;
  return x - Math.floor(x);
}

function shuffleArray(array, seed) {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i -= 1) {
    const j = Math.floor(seededRandom(seed + i) * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

export async function getTodayChecklistForUser(userId) {
  // Adjust to WIB (UTC+7)
  const now = new Date();
  const wibNow = new Date(now.getTime() + 7 * 60 * 60 * 1000);
  const todayWIB = new Date(
    wibNow.getFullYear(),
    wibNow.getMonth(),
    wibNow.getDate(),
    0,
    0,
    0,
    0
  );

  const yyyy = todayWIB.getFullYear();
  const mm = String(todayWIB.getMonth() + 1).padStart(2, "0");
  const dd = String(todayWIB.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;
  const seed = parseInt(`${yyyy}${mm}${dd}`, 10);

  const allTasks = await DailyTask.find();
  if (!allTasks.length) {
    const error = new Error("NO_DAILY_TASKS_AVAILABLE");
    error.status = 404;
    throw error;
  }

  const shuffled = shuffleArray(allTasks, seed);
  const selected = shuffled.slice(0, 5);

  const tasksWithChecklist = await Promise.all(
    selected.map(async (task) => {
      let checklist = await DailyTaskChecklist.findOne({
        userId,
        dailyTaskId: task._id,
      }).populate("treeLeafId");

      if (!checklist) {
        checklist = await DailyTaskChecklist.create({
          userId,
          dailyTaskId: task._id,
          isCompleted: false,
        });
      }

      return {
        _id: checklist._id,
        dailyTaskId: task._id,
        title: task.title,
        category: task.category,
        symbol: task.symbol,
        isCompleted: checklist.isCompleted,
        treeLeafId: checklist.treeLeafId,
      };
    })
  );

  return {
    date: todayStr,
    tasks: tasksWithChecklist,
  };
}
