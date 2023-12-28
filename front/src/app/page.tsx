"use client";

import { Dashboard } from "@/components/dashboard";
import Image from "next/image";
import React, { useState, useEffect } from "react";
import personsData from "../data/fotos_path.json"; // Import local JSON file

export default function Home() {
  const [persons, setPersons] = useState(personsData);

  const handlePersonClick = (person: any) => {
    // Handle person click
    console.log("Selected Person:", person);
  };

  return <Dashboard persons={persons} onPersonClick={handlePersonClick} />;
}
