import { useEffect, useState } from "react";
import { toast } from "react-toastify";
import { useAuth } from "../context/AuthContext";
import { plantApi } from "../api/api";
import { getSocket } from "../api/socket";
import Navbar from "../components/Navbar";
import TopHeader from "../components/TopHeader";

export default function Plants() {
  const { firebaseUser } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);
  const [infoPlant, setInfoPlant] = useState(null);
  const [editPlant, setEditPlant] = useState(null);
  const [editMoisture, setEditMoisture] = useState(60);

  function load() {
    if (!firebaseUser) return;
    setLoading(true);
    plantApi
      .listForUser(firebaseUser.uid)
      .then(({ data }) => setPlants(data.plants))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }

  useEffect(load, [firebaseUser]);

  useEffect(() => {
    const socket = getSocket();
    function onUpdate() {
      load();
    }
    socket.on("plantUpdated", onUpdate);
    socket.on("plantAdded", onUpdate);
    socket.on("plantDeleted", onUpdate);
    return () => {
      socket.off("plantUpdated", onUpdate);
      socket.off("plantAdded", onUpdate);
      socket.off("plantDeleted", onUpdate);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function handleDelete(plantId) {
    if (!confirm("Delete this plant? This frees up its sensor/pump slot.")) return;
    try {
      await plantApi.remove(plantId);
      toast.success("Plant deleted");
      setPlants((prev) => prev.filter((p) => p._id !== plantId));
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not delete plant");
    }
  }

  function openEdit(plant) {
    setEditPlant(plant);
    setEditMoisture(plant.preferred_moisture);
  }

  async function saveEdit(e) {
    e.preventDefault();
    try {
      await plantApi.update(editPlant._id, { preferred_moisture: Number(editMoisture) });
      toast.success("Moisture level updated");
      setPlants((prev) =>
        prev.map((p) =>
          p._id === editPlant._id ? { ...p, preferred_moisture: Number(editMoisture) } : p
        )
      );
      setEditPlant(null);
    } catch (err) {
      toast.error(err.response?.data?.message || "Could not update plant");
    }
  }

  return (
    <div className="pb-24">
      <TopHeader title="My Plants" />

      <div className="px-4 mt-2 space-y-3">
        {loading && <p className="text-gray-400 text-center mt-8">Loading...</p>}
        {!loading && plants.length === 0 && (
          <p className="text-gray-400 text-center mt-8">No plants added yet.</p>
        )}

        {plants.map((plant) => (
          <div key={plant._id} className="bg-white rounded-xl shadow p-4">
            <div className="flex justify-between items-start">
              <div>
                <p className="font-semibold text-gray-800">{plant.plant_name}</p>
                <p className="text-xs text-gray-500">Preferred moisture: {plant.preferred_moisture}%</p>
                <p className="text-xs text-gray-500">
                  Last watered:{" "}
                  {plant.last_watering_time ? new Date(plant.last_watering_time).toLocaleString() : "Never"}
                </p>
                <p className="text-xs text-gray-400">
                  Added: {new Date(plant.planting_date).toLocaleDateString()}
                </p>
              </div>
              <button
                onClick={() => setInfoPlant(plant)}
                className="w-7 h-7 rounded-full border border-gray-300 text-gray-500 text-sm"
                aria-label="Pin connection info"
              >
                i
              </button>
            </div>
            <div className="flex gap-2 mt-3">
              <button
                onClick={() => openEdit(plant)}
                className="flex-1 text-sm py-2 rounded-lg border border-brand text-brand font-medium"
              >
                Edit
              </button>
              <button
                onClick={() => handleDelete(plant._id)}
                className="flex-1 text-sm py-2 rounded-lg border border-red-300 text-red-500 font-medium"
              >
                Delete
              </button>
            </div>
          </div>
        ))}
      </div>

      {infoPlant && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-40"
          onClick={() => setInfoPlant(null)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-2">{infoPlant.plant_name} — Pin Connection</h3>
            <p className="text-xs text-gray-600 leading-relaxed">{infoPlant.pin_connection_description}</p>
            <button
              onClick={() => setInfoPlant(null)}
              className="w-full mt-4 py-2 rounded-lg bg-brand text-white font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {editPlant && (
        <div
          className="fixed inset-0 bg-black/40 flex items-center justify-center px-6 z-40"
          onClick={() => setEditPlant(null)}
        >
          <div className="bg-white rounded-xl p-5 w-full max-w-sm" onClick={(e) => e.stopPropagation()}>
            <h3 className="font-semibold text-gray-800 mb-3">Edit {editPlant.plant_name}</h3>
            <form onSubmit={saveEdit} className="space-y-3">
              <label className="text-sm text-gray-600">
                Preferred moisture: <span className="font-semibold">{editMoisture}%</span>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                value={editMoisture}
                onChange={(e) => setEditMoisture(e.target.value)}
                className="w-full accent-brand"
              />
              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditPlant(null)}
                  className="flex-1 py-2 rounded-lg border border-gray-300 text-gray-600"
                >
                  Cancel
                </button>
                <button type="submit" className="flex-1 py-2 rounded-lg bg-brand text-white font-semibold">
                  Save
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      <Navbar />
    </div>
  );
}
