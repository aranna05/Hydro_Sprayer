import axiosClient from "./axiosClient";

export const userApi = {
  create: (data) => axiosClient.post("/users", data),
  get: (uid) => axiosClient.get(`/users/${uid}`),
  update: (uid, data) => axiosClient.put(`/users/${uid}`, data),
};

export const plantApi = {
  add: (data) => axiosClient.post("/plants", data),
  listForUser: (uid) => axiosClient.get(`/plants/${uid}`),
  getOne: (plantId) => axiosClient.get(`/plants/single/${plantId}`),
  update: (plantId, data) => axiosClient.put(`/plants/${plantId}`, data),
  remove: (plantId) => axiosClient.delete(`/plants/${plantId}`),
};

export const notificationApi = {
  listForUser: (uid) => axiosClient.get(`/notifications/${uid}`),
  markRead: (id) => axiosClient.put(`/notifications/${id}/read`),
};
