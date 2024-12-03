import { scheduleJob } from "node-schedule";
import moment from "moment";
import admin from "firebase-admin";
import { json } from "express";

// Map to store scheduled jobs
const scheduledJobs = {};

admin.initializeApp({
    credential: admin.credential.cert("./firebaseServiceAccount.json"),
});


// Simulated admin.messaging().send for testing
const sendNotification = async (taskId, title, body, userFcmToken) => {
    const { rewardImg, taskImg } = body;
   const idForTask= JSON.stringify(taskId)
    const message = {
        notification: { title },
        data: {
            idForTask,
            title, rewardImg, taskImg,
            screen: "Reward"
        },
        token: userFcmToken,
    }

    try {
        console.log(`Sending notification:`, JSON.stringify(message, null, 2));
        const response = await admin.messaging().send(message);
        console.log(`Notification sent successfully for task ID: ${taskId}, Response:`, response);
    } catch (error) {
        console.error(`Error sending notification for task ID: ${taskId}`, error);
    }
};

// Function to parse reminder time and return the hour and minute in 24-hour format
const parseReminderTime = (time, period) => {
    const [hour, minute] = time.split(/[: ]/);
    const reminderHour = period === "PM" ? parseInt(hour) + 12 : parseInt(hour);
    return { reminderHour, minute: parseInt(minute) };
};

// Function to schedule the notification job based on time and other parameters
const scheduleNotificationJob = (scheduleRule, taskId, name, rewardFile, taskFile, userFcmToken) => {
    return scheduleJob(scheduleRule, async () => {
        console.log(`Triggered notification job for task ID: ${taskId}`);
        // console.log(`rewardImg job for task ID: ${rewardImg} at ${rewardImg}`);
        await sendNotification(
            // schedule=true,
            taskId,
            name,
            {
                rewardImg: rewardFile?.url ? rewardFile?.url : "https://cdn.pixabay.com/photo/2022/06/16/10/17/road-7265607_1280.jpg",
                taskImg: taskFile?.url ? taskFile?.url : "https://cdn.pixabay.com/photo/2022/08/05/20/24/alps-7367539_1280.jpg",
            },
            userFcmToken
        );
    });
};

// Function to schedule daily notifications
const scheduleDailyNotifications = (reminderTime, taskId, name, rewardFile, taskFile, userFcmToken) => {
    const { reminderHour, minute } = parseReminderTime(reminderTime);
    const scheduleRule = `${minute} ${reminderHour} * * *`;
    return scheduleNotificationJob(scheduleRule, taskId, name, rewardFile, taskFile, userFcmToken);
};

// Function to schedule weekly notifications
const scheduleWeeklyNotifications = (selectedDays, reminderTime, taskId, name, rewardFile, taskFile, userFcmToken) => {
    const jobs = [];
    selectedDays.forEach((day) => {
        const { reminderHour, minute } = parseReminderTime(reminderTime);
        const momentDay = moment().day(day).day();
        const scheduleRule = { dayOfWeek: momentDay, hour: reminderHour, minute: minute };
        jobs.push(scheduleNotificationJob(scheduleRule, taskId, name, rewardFile, taskFile, userFcmToken));
    });
    return jobs;
};


const scheduleIntervalNotifications = (reminderMints, taskId, name, rewardFile, taskFile, userFcmToken) => {
    // Set the start time for the notification, which is 'reminderMints' minutes from now
    const startTime = moment().add(reminderMints, "minutes").toDate();
  
    // Schedule a one-time notification job
    // return scheduleNotificationJob({ start: startTime }, taskId, name, rewardFile, taskFile, userFcmToken);
    return scheduleJob(startTime, async () => {
        console.log(`Triggered one-time notification job for task ID: ${taskId}`);
        await sendNotification(
            taskId,
            name,
            {
                rewardImg: rewardFile?.url ? rewardFile.url : "https://cdn.pixabay.com/photo/2022/06/16/10/17/road-7265607_1280.jpg",
                taskImg: taskFile?.url ? taskFile.url : "https://cdn.pixabay.com/photo/2022/08/05/20/24/alps-7367539_1280.jpg",
            },
            userFcmToken
        );
    });
  };

// Utility function to schedule notifications
export const scheduleNotifications = (task, token) => {
    let { id, tasks_data } = task;
    tasks_data = JSON.parse(tasks_data);
    const [{ reminderType, selectedDays, reminderTime, reminderMints, rewardFile, taskFile, name }] = tasks_data;
    const userFcmToken = token

    console.log(`Reminder Type: ${reminderType}, Task ID: ${id}`);

    // Cancel existing jobs for this task
    if (scheduledJobs[id]) {
        console.log(`Found existing jobs for task ID: ${id}. Cancelling...`);
        scheduledJobs[id].forEach((job) => job && job.cancel());
        delete scheduledJobs[id];
        console.log(`Cancelled existing jobs for task ID: ${id}`);
    }

    const jobs = [];

    // Scheduling based on reminder type
    if (reminderType === "daily") {
        jobs.push(scheduleDailyNotifications(reminderTime, id, name, rewardFile, taskFile, userFcmToken));
    } else if (reminderType === "weekly") {
        jobs.push(...scheduleWeeklyNotifications(selectedDays, reminderTime, id, name, rewardFile, taskFile, userFcmToken));
    }

    // Scheduling interval notifications
    if (reminderMints && !isNaN(reminderMints) && parseInt(reminderMints) > 0) {
        jobs.push(scheduleIntervalNotifications(reminderMints, id, name, rewardFile, taskFile, userFcmToken));
    }

    scheduledJobs[id] = jobs;
    console.log("Notifications scheduled:", jobs.length);
}


// Function to schedule interval notifications
// const scheduleIntervalNotifications = (reminderMints, taskId, name, rewardFile, taskFile, userFcmToken) => {
//     const scheduleRule = `*/${reminderMints} * * * *`;
//     const startTime = moment().add(reminderMints, "minutes").toDate();
//     return scheduleNotificationJob({ start: startTime, rule: scheduleRule }, taskId, name, rewardFile, taskFile, userFcmToken);
// };
