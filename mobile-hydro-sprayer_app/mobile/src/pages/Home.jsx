import { useEffect, useState } from "react";
import { useAuth } from "../context/AuthContext";
import { plantApi } from "../api/api";
import { getSocket } from "../api/socket";
import GaugeChart from "../components/GaugeChart";
import Navbar from "../components/Navbar";
import TopHeader from "../components/TopHeader";

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default function Home() {
  const { firebaseUser, profile } = useAuth();
  const [plants, setPlants] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!firebaseUser) return;
    plantApi
      .listForUser(firebaseUser.uid)
      .then(({ data }) => setPlants(data.plants))
      .catch((err) => console.error(err))
      .finally(() => setLoading(false));
  }, [firebaseUser]);

  useEffect(() => {
    const socket = getSocket();

    function onMoisture({ plant_id, current_moisture }) {
      setPlants((prev) =>
        prev.map((p) => (p._id === plant_id ? { ...p, current_moisture } : p))
      );
    }
    function onPlantUpdated(updated) {
      setPlants((prev) => prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p)));
    }
    function onPlantAdded(newPlant) {
      setPlants((prev) => [newPlant, ...prev]);
    }
    function onPlantDeleted({ _id }) {
      setPlants((prev) => prev.filter((p) => p._id !== _id));
    }

    socket.on("moistureUpdate", onMoisture);
    socket.on("plantUpdated", onPlantUpdated);
    socket.on("plantAdded", onPlantAdded);
    socket.on("plantDeleted", onPlantDeleted);
    return () => {
      socket.off("moistureUpdate", onMoisture);
      socket.off("plantUpdated", onPlantUpdated);
      socket.off("plantAdded", onPlantAdded);
      socket.off("plantDeleted", onPlantDeleted);
    };
  }, []);

  const lastName = profile?.name ? profile.name.split(" ").slice(-1)[0] : "";

  return (
    <div className="pb-24">
      <TopHeader title="Home" />

      <div className="px-4">
        <p className="text-gray-500 text-sm">{new Date().toLocaleString()}</p>
        <h2 className="text-xl font-bold text-gray-800 mt-1">
          {getGreeting()}, {lastName || "there"} 👋
        </h2>

        {loading && <p className="text-gray-400 mt-8 text-center">Loading your plants...</p>}

        {!loading && plants.length === 0 && (
          <div className="mt-10 text-center text-gray-400">
            <p>No plants yet.</p>
            <p className="text-sm">Add your first plant from the "Add Plant" tab.</p>
          </div>
        )}

        <div className="grid grid-cols-2 gap-4 mt-6">
          {plants.map((plant) => (
            <div key={plant._id} className="bg-white rounded-xl shadow p-3 relative">
              <p className="text-sm font-semibold text-gray-700 truncate">{plant.plant_name}</p>
              <div className="flex justify-center">
                <GaugeChart value={plant.current_moisture} size={120} />
              </div>
              <p className="text-xs text-gray-500 text-center">
                Preferred: {plant.preferred_moisture}%
              </p>
              <p className="text-[10px] text-gray-400 text-center">
                Last watered:{" "}
                {plant.last_watering_time ? new Date(plant.last_watering_time).toLocaleString() : "Never"}
              </p>
              {plant.is_watering && (
                <span className="absolute top-2 right-2 text-[10px] bg-blue-100 text-blue-600 px-2 py-0.5 rounded-full">
                  Watering
                </span>
              )}
            </div>
          ))}
        </div>
      </div>

      <Navbar />
    </div>
  );
}
