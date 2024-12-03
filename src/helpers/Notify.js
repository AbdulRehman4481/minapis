import admin from "firebase-admin";

export const sendNotification = async () => {
  const message = {
    topic: "alarm_notifications",
    data: {
      screen: "AlarmScreen",
    },
    android: {
      priority: "high",
    },
    apns: {
      payload: {
        aps: {
          contentAvailable: true,
          alert: {
            title: "Alarm Triggered!",
            body: "Your alarm has gone off.",
          },
        },
      },
    },
  };

  try {
    await admin.messaging().send(message);
    console.log("Notification sent successfully");
  } catch (error) {
    console.error("Error sending notification:", error);
  }
};
