import React, { useState } from "react";
import ChatWidget from "./components/ChatWidget";
import LicenseForm from "./components/LicenseForm";
import "./App.css";

function App() {
  const [licenses, setLicenses] = useState([]);

  // Function to handle adding a new license
  const handleAddLicense = (newLicense) => {
    setLicenses([...licenses, newLicense]); // Add the new license to the state
  };

  return (
    <div className="App"> 
      <ChatWidget />
      {/* Pass handleAddLicense function as a prop */}
      <LicenseForm onAddLicense={handleAddLicense} />

     
    </div>
  );
}

export default App;
