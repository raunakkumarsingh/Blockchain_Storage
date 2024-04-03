import { useState } from "react";
import "./Display.css";

const Display = ({ contract, account }) => {
  const [data, setData] = useState("");

  async function fetchData(item) {
    try {
      const response = await fetch(`https://ipfs.io/${item.substring(29)}`);
      if (!response.ok) {
        throw new Error('Failed to fetch data');
      }
      const data = await response.json();
      return data.ImgHash;
    } catch (error) {
      console.error('Error fetching data:', error);
      return null;
    }
  }
  
  const getdata = async () => {
    const Otheraddress = document.querySelector(".address").value;
    let dataArray;
    try {
      if (Otheraddress) {
        dataArray = await contract.display(Otheraddress);
      } else {
        dataArray = await contract.display(account);
      }
    } catch (e) {
      alert("You don't have access");
      return;
    }
    
    if (dataArray && dataArray.length > 0) {
      const str_array = dataArray.map(item => item.toString());
      const images = await Promise.all(str_array.map(fetchData));
      const filteredImages = images.filter(img => img); // Remove null values
      if (filteredImages.length > 0) {
        const imageElements = filteredImages.map((img, i) => (
          <a href={dataArray[i]} key={i} target="_blank">
            <img
              key={i}
              src={`https://ipfs.io/${img.substring(29)}`}
              alt="new"
              className="image-list"
            />
          </a>
        ));
        setData(imageElements);
      } else {
        alert("No image to display");
      }
    } else {
      alert("No image to display");
    }
  };

  return (
    <>
      <div className="image-list">{data}</div>
      <input
        type="text"
        placeholder="Enter Address"
        className="address"
      />
      <button className="center button" onClick={getdata}>
        Get Data
      </button>
    </>
  );
};

export default Display;
