'use client';
import { useEffect, useMemo, useRef, useState } from 'react';
import { useParams } from 'next/navigation';
import { toast } from 'react-toastify';
import { BsLock } from 'react-icons/bs';
import { FaEye, FaEyeSlash, FaCamera, FaSearchPlus, FaCog, FaSearchMinus, FaFileExport,FaPlus, FaRegTimesCircle,FaSearchLocation, FaInstagram, FaTimes, FaMinus, FaDrawPolygon, FaSquare, FaCircle, FaRegSquare, FaRegCircle, FaMousePointer, FaTrashAlt, FaArrowsAlt, FaPenSquare,FaPen } from 'react-icons/fa';
import 'animate.css';
import Link from 'next/link';
import * as d3 from 'd3';
import * as XLSX from "xlsx";




// For Active Tool description....
const toolDescriptions = {
  box: "Use this tool to define category in a box shape. The nodes that are in the area will be effected",
  lasso: "Use this tool to define category in a freehand selection.The nodes that are in the area will be effected",
  filledCircleSelect: "Use this tool to define category in a filled circle.The nodes that are in the area will be effected",
  line: "Use this tool to draw a straight line.",
  rectangle: "Use this tool to draw a rectangle shape.",
  filledRectangle: "Use this tool to draw a filled rectangle.",
  circle: "Use this tool to draw a circle shape.",
  filledCircle: "Use this tool to draw a filled circle.",
  title: "Use this tool to add a title to your drawing.",
  select: "Use this tool to select and modify shapes.",
  "drag-shape": "Use this tool to drag and move shapes around.",
};

interface SubPlotPayload {
  projectTitle: string;
  selection: string;
  email: string;
  data?: DataPoint[];    
  shapes?: any[];        
}



interface Shape {
  id: string; 
  type: 'filledRectangle' | 'filledCircle' | 'rectangle' | 'circle' | 'line' | 'title' | 'path' | 'drag-shape'; 
  x?: number; 
  y?: number; 
  width?: number; 
  height?: number; 
  cx?: number; 
  cy?: number; 
  r?: number; 
  x1?: number; 
  y1?: number; 
  x2?: number; 
  y2?: number; 
  text?: string; 
  color?: string; 
  size?: number; 
  opacity?: number;
  background?: string; 
  position?: { x: number; y: number };
  stroke?: string;
  d?: string; // SVG path data için
  category?:string;
  nodeIds?: string[];
}


type DataPoint = {
  id:string;
  ID : string;
  Data_Id:string;
  X: string; 
  Y: string; 
  Label?: string; 
  Size: string; 
  Color: string; 
  Level1 : string;
  Modularity_Class: string; 
  Custom_Filter:string;
  Pageranks:string;
  Category?: string;
  Shape?: Shape;
  nodeIds: string[];
};

// Define the type for the node
interface Node {
  label?: string;
  x: number;
  y: number;
  category: string;
  Shape?: Shape;
  nodeIds: string[];
}

// Define the props type for NodeInfoBox
interface NodeInfoBoxProps {
  highlightedNodes: Node[];
  onClose: () => void;
}




const ProjectMapPage = () => {
  const [isSaving, setIsSaving] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);  
  const [apiLoading, setApiLoading] = useState(false);     

  
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selection, setSelection] = useState("with all"); // Default value
  const [loading, setLoading] = useState(false);
  const [showSubplots, setShowSubplots] = useState(false); // State to toggle subplot visibility
  const [subplots, setSubplots] = useState([]); 

  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const [categoryColor, setCategoryColor] = useState('#000000');
  const [selectionPath, setSelectionPath] = useState<string | null>(null);

  const params = useParams();
  const projectTitle = decodeURIComponent(params.projectTitle as string);
  const [userEmail, setUserEmail] = useState('');
  const [csrfToken, setCsrfToken] = useState('');
  const [data, setData] = useState<DataPoint[]>([]);
  const [searchLabel, setSearchLabel] = useState('');
  const [highlightedLabel, setHighlightedLabel] = useState<string[] | null>(null);



  const [showLabels, setShowLabels] = useState(true);
  const [showPins, setShowPins] = useState(true);
  const [userRole, setUserRole] = useState<string>('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [nodeSize, setNodeSize] = useState(5); 
  const [labelSize, setLabelSize] = useState(2); 
  const [bgColor, setBgColor] = useState('#ffffff'); 
  const [plotNodes, setPlotNodes] = useState([]); 
  const [uniqueModularityClasses, setUniqueModularityClasses] = useState<string[]>([]);
  const [selectedModularityClasses, setSelectedModularityClasses] = useState<Set<string>>(new Set());
  const [labelColor, setLabelColor] = useState('#000000'); 

  const [drawColor, setDrawColor] = useState('#000000');  
  const [fillColor, setFillColor] = useState('#000000');  
  const [selectedColor, setSelectedColor] = useState('black'); 

  const [positionOFShapeAfterDrag, setPositionOFShapeAfterDrag] = useState({ x: 0, y: 0 });

  const svgRef = useRef<SVGSVGElement | null>(null);
  const drawLayerRef = useRef<SVGGElement | null>(null);
  const [svgSelection, setSvgSelection] = useState<d3.Selection<SVGGElement, unknown, null, undefined> | null>(null);

  const [coordinates, setCoordinates] = useState<{ x: string | null; y: string | null }>({ x: null, y: null });
  const [tooltip, setTooltip] = useState<{ label: string; x: number; y: number } | null>(null);
  const [mousePosition, setMousePosition] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawMode, setDrawMode] = useState(false);
  const [shapeType, setShapeType] = useState<'line' | 'rectangle' | 'circle' | 'title' | 'select' | 'filledRectangle' | 'filledCircle' | 'box' | 'lasso' | 'filledCircleSelect' | 'drag-shape' | null>(null);

  const [pathData, setPathData] = useState<string>(''); // Line path data
  const [rectStart, setRectStart] = useState<{ x: number; y: number } | null>(null);
  const [circleStart, setCircleStart] = useState<{ x: number; y: number } | null>(null);
  const [shapes, setShapes] = useState<any[]>([{ type: 'line', x1: 0, y1: 0, x2: 1, y2: 1, color: 'transparent' }]); // Store all shapes and add unseen default value to the shapes in order to block crash!

  const width = window.innerWidth;
  const height = window.innerHeight;
  const [newXScale, setNewXScale] = useState(() => d3.scaleLinear().domain([-10, 10]).range([40, width - 40]));
  const [newYScale, setNewYScale] = useState(() => d3.scaleLinear().domain([-10, 10]).range([height - 40, 40]));
  const [zoomTransform, setZoomTransform] = useState(d3.zoomIdentity);

  const [showInput, setShowInput] = useState(false);
  const [titlePosition, setTitlePosition] = useState({ x: 0, y: 0 });
  const [titleText, setTitleText] = useState('');
  const [titleColor, setTitleColor] = useState('black'); // Color state
  const [titleSize, setTitleSize] = useState<number>(16);
  const [titleBackground, setTitleBackground] = useState('black'); // Background color state
  const [isAddingTitle, setIsAddingTitle] = useState(false);
  const [isUpdatingTitle, setIsUpdatingTitle] = useState(false);
  const [selectedTitleShape, setSelectedTitleShape] = useState<{ id: string; text: string; color: string; size: string;  background: string; type:string} | null>(null);

  const [lineStart, setLineStart] = useState<{ x: number; y: number; } | null>(null);



  const [selectedShape, setSelectedShape] = useState<{
    category: string;
    fillColor:any;
    type: string;
    id: string;
    stroke: string;
    width: number;
    r: number;
    background: string;
    height: number;
    opacity: number;
    nodeIds?: string[]; 
  } | null>(null);


  const [filledRectangleOpacity, setFilledRectangleOpacity] = useState(0.1); // Opaklık değeri
  const [filledCircleOpacity, setFilledCircleOpacity] = useState(0.1);
  const [strokeColor, setStrokeColor] = useState(selectedShape?.stroke || "#000000");
  const [tempRadius, setTempRadius] = useState(selectedShape?.r || 50);
  const [tempWidth, setTempWidth] = useState(selectedShape?.width || 100); // Varsayılan genişlik
  const [tempHeight, setTempHeight] = useState(selectedShape?.height || 100); // Varsayılan yükseklik
  const [tempOpacity, setTempOpacity] = useState(selectedShape?.opacity || 0.1);
  const [tempFillColor, setTempFillColor] = useState(selectedShape?.fillColor || '#000000');
  const [opacityValue, setOpacityValue] = useState(selectedShape?.opacity || 0.1); // Varsayılan olarak mevcut opacity değeri 


  const [boxStart, setBoxStart] = useState(null);
  const [boxEnd, setBoxEnd] = useState(null);
  const [highlightedNodes, setHighlightedNodes] = useState<DataPoint[]>([]);
  const [showInfoBox, setShowInfoBox] = useState(false);
  const toggleInfoBox = () => setShowInfoBox(!showInfoBox);
  const [showInfoPanel, setShowInfoPanel] = useState(false); // Define the state variable


  const [selectedPinImage, setSelectedPinImage] = useState('pin1'); // Default pin image

  const [selectionBoxInfo, setSelectionBoxInfo] = useState({
    x: 0,
    y: 0,
    width: 0,
    height: 0,
  });
  const [selectionType, setSelectionType] = useState<'box' | 'lasso' | 'filledCircleSelect' |'path' | null>(null);

  const [showCategories, setShowCategories] = useState(false);

  const [lastAddedCategoryShapeID, setLastAddedCategoryShapeID] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState("");
  const [openCategories, setOpenCategories] = useState<{ [key: string]: boolean }>({});

  const [clickedPosition, setClickedPosition] = useState<{ x: number, y: number } | null>(null);

  const [cpose, setCpose] = useState<{ x: number; y: number } | null>(null);


useEffect(() => {
  if (drawLayerRef.current) {
    // SVG öğesini d3 ile seç
    const selection = d3.select(drawLayerRef.current);
    setSvgSelection(selection); // D3 seçim nesnesini state'e kaydet
  }
}, []); // Bileşen ilk render edildiğinde çalışır

useEffect(() => {
  const fetchUserEmail = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/users/me/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setUserEmail(data.email);
      } else {
        throw new Error('Failed to fetch user email');
      }
    } catch (error) {
      console.error('Error fetching user email:', error);
    }
  };

  fetchUserEmail();
}, []);


useEffect(() => {
  const fetchData = async () => {
    try {
      const response = await fetch(
        process.env.NEXT_PUBLIC_HOST + `/api/user-project-data/${encodeURIComponent(projectTitle)}/`,
        {
          method: 'GET',
          credentials: 'include', 
        }
      );

      if (!response.ok) {
        throw new Error('API request failed');
      }

      const jsonData = await response.json();
      setData(jsonData);
      console.log(data);
    } catch (error) {
      console.error('Error fetching data:', error);
      toast.error('Error fetching data');
    }
  };

  fetchData();
}, [projectTitle]);


useEffect(() => {
  const fetchCsrfToken = async () => {
    try {
      const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/get-csrf-token/', {
        method: 'GET',
        credentials: 'include',
      });

      if (response.ok) {
        const data = await response.json();
        setCsrfToken(data.csrfToken);
      } else {
        throw new Error('Failed to fetch CSRF token');
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
      toast.error('Error fetching CSRF token');
    }
  };

  fetchCsrfToken();
}, []);

const fetchShapes = async () => {
  try {
      const encodedProjectTitle = encodeURIComponent(projectTitle);
      const encodedUserEmail = encodeURIComponent(userEmail);
      
      const response = await fetch(`${process.env.NEXT_PUBLIC_HOST}/api/load-shapes/${encodedProjectTitle}/?userEmail=${encodedUserEmail}`, {
          method: 'GET',
          credentials: 'include',
      });

      console.log('Response status:', response.status); 
      if (response.ok) {
          const shapesData = await response.json();
          console.log('Fetched shapes data from API:', shapesData); 
          
          const { shapes }: { shapes: Shape[] } = shapesData; 
          console.log('Shapes from API:', shapes); 

          const processedShapes = shapes.map((shape: Shape) => {
              
              return {
                  ...shape,
                
              };
          });

          setShapes(processedShapes);
      } else {
          const errorText = await response.text(); 
          console.error('Failed to fetch shapes:', errorText);
          throw new Error('Failed to fetch shapes');
      }
  } catch (error) {
      console.error('Error fetching shapes:', error);
      toast.error("Error fetching shapes");
  }
};

const whatIsMyRole = async () => {
  try {
    const encodedProjectTitle = encodeURIComponent(projectTitle);
    const encodedUserEmail = encodeURIComponent(userEmail);
    const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/user-role/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken,
      },
      body: JSON.stringify({projectTitle:encodedProjectTitle, email: encodedUserEmail}),
      credentials: 'include',
    });
    if (response.ok) {
      const roleData = await response.json();
      setUserRole(roleData.role);  // Update state with the role from API
      toast.success("Role fetched successfully");
    } else {
      throw new Error('Failed to fetch role');
    }
  } catch (error) {
    console.error('Error fetching role:', error);
    
  }
};




const saveShapes = async () => {
  try {
    setIsSaving(true); 
    const response = await fetch(
      process.env.NEXT_PUBLIC_HOST + `/api/save-shapes/${encodeURIComponent(projectTitle)}/`,
      {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken,
        },
        body: JSON.stringify({
          userEmail: userEmail,
          shapes: shapes,
          nodeData: data,
        }),
        credentials: 'include',
      }
    );

    if (response.ok) {
      toast.success('Shapes saved successfully');
    } else {
      throw new Error('Failed to save shapes');
    }
  } catch (error) {
    console.error('Error saving shapes:', error);
    toast.error('Error saving shapes');
  } finally {
    setIsSaving(false); 
  }
};


useEffect(() => {
  if (userEmail && projectTitle) {
      fetchShapes();
      whatIsMyRole();
  }
}, [projectTitle, userEmail]); 

console.log('User Email:', userEmail);
console.log('Shapes:', shapes);


  const handleSettingsToggle = () => {
    setSettingsOpen(!settingsOpen);
  };

  useEffect(() => {
    const svgElement = svgRef.current;
    if (!svgElement) return;
    
    // Update the background color of the SVG
    d3.select(svgElement)
      .style('background-color', bgColor);
  }, [bgColor]);




  const handleSvgClick = (event: any) => {
    const svgElement = svgRef.current;
    if (!svgElement) return; // Check if svgElement is present
  
    // Mouse positions after zoom and pan
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transform = d3.zoomTransform(svgElement);
    const [x, y] = transform.invert([mouseX, mouseY]); // Convert to SVG coordinates
    
    console.log("cursor position : " + x, y);
   
    
    // Only set title position when 'title' shape type is selected and not adding a title already
    if (shapeType === 'title' && !isAddingTitle) {
      setIsAddingTitle(true);       // Mark title creation as active
      setTitlePosition({ x, y });  // Set the title position only once
      console.log("Setting title position to: ", x, y); // Log clicked position debug purposes
    } else {
      console.log("Ignoring click, not in title creation mode");
      
    }
  
    // Reset selected shape if clicking on empty space
    setSelectedShape(null);
    
  };
  
  


const highlightShape = (shape:any) => {
  const svgElement = svgRef.current;

  if (shape.type === 'line') {
    d3.select(`#${shape.id}`) 
        .style('stroke-width', '4') // Kalınlaştırma
        .style('stroke', 'red'); // Renk değişimi
} else if (shape.type === 'rectangle') {
    d3.select(`#${shape.id}`)
        .style('stroke-width', '4')
        .style('stroke', 'red');
} else if (shape.type === 'circle') {
    d3.select(`#${shape.id}`)
        .style('stroke-width', '4')
        .style('stroke', 'red');
} else if (shape.type === 'title') {
    d3.select(`#${shape.id}`)
        .style('stroke-width', '4')
        .style('fill', 'red'); 
} else if (shape.type === 'filledCircle') {
    d3.select(`#${shape.id}`)
        .style('stroke-width', '10')
        .style('stroke', 'red')
        .style('fill', 'black');
} else if (shape.type === 'filledRectangle') {
    d3.select(`#${shape.id}`)
        .style('stroke-width', '10')
        .style('stroke', 'red')
        .style('fill', 'black'); 
}
else if (shape.type === 'path') {
  d3.select(`#${shape.id}`)
      .style('stroke-width', '10')
      .style('stroke', 'red')
      .style('fill', 'black'); 
}
};





const deleteSelectedShape = () => {
  if (selectedShape && !selectedShape.hasOwnProperty('category')) {
    // console.log("worked-1"); DEBUG

    // Seçilen şekli kaldır
    setShapes(prevShapes =>
      prevShapes.filter(shape => {
        // Şekil türü ve id kontrolü
        return !(shape.type === selectedShape.type && shape.id === selectedShape.id);
      })
    );

    console.log("Shape deleted successfully..");

    // Eğer silinen şekil bir 'title' ise, resetTitleInput() çağır
    if (selectedShape.type === 'title') {
      resetTitleInput();
    }

    // Seçili şekli sıfırla
    setSelectedShape(null);
  } else if  (selectedShape){
  //console.log("worked-2");

   // Seçilen şeklin ID'sini ve kategorisi
   const selectedShapeCategory = selectedShape.category;
   const selectedShapeId = selectedShape.id;
 
   if (!selectedShapeCategory) {
     toast.error("The selected shape does not have a category");
     return;
   }
 
   // Seçilen kategoriye sahip olanları düzenle
   const updatedData = data.map((node) => {
     if (node.Category) {
       const updatedCategories = node.Category.split(",")
         .map((cat) => cat.trim())
         .filter((cat) => cat !== selectedShapeCategory) // remove selected category 
         .join(",");
 
       return {
         ...node,
         Category: updatedCategories, // set the updated categories
       };
     }
     return node;
   });
 
   // remove-filter the selected shape 
   const updatedShapes = shapes.filter((shape) => shape.id !== selectedShapeId);
 
   // update nodes-data and shapes 
   setData(updatedData);
   setShapes(updatedShapes);
 
   toast.success(`Category "${selectedShapeCategory}" and associated shape deleted`);
 
   // reset selected shape 
   setSelectedShape(null);

}

    
};


  

// updating shapes frequently whenever a changing happens... key for dynamic page
useEffect(() => {
  console.log(shapes);
  console.log("---------------------");
  console.log(data); // DEBUG PURPOSE
}, [data, shapes]);


  
const addTitle = () => {
    const newTitle = {
        id: `title-${shapes.length}`, // Generate unique id
        type: 'title',
        position: titlePosition,
        text: titleText,
        color: titleColor,
        size: titleSize,
        background: titleBackground,
    };

    setShapes((prevShapes) => [...prevShapes, newTitle]); // Add new title to shapes
    console.log(`Title added at (${titlePosition.x}, ${titlePosition.y}): ${titleText}`);

    // Reset input values
    setShowInput(false);
    setShapeType('select');
    resetTitleInput();
    setIsUpdatingTitle(false);
    setIsAddingTitle(false);

    // Log information when drawMode is active
    if (drawMode) {
        console.log("Title added while drawMode is active.");
    }
};


const updateOpacity = (newOpacity:any) => {
  if (selectedShape) {
    const updatedShape = {
      ...selectedShape,
      opacity: parseFloat(newOpacity), // new opacity value
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes); // update all shapes data 
    setSelectedShape(updatedShape); // update selectedshape
  }
};

const updateFilledRectangle = (newOpacity: any, newWidth: any, newHeight: any, newColor: any) => {
  if (selectedShape && selectedShape.type === 'filledRectangle') {
    const updatedShape = {
      ...selectedShape,
      background: newColor !== undefined ? newColor : selectedShape.background, // Update fill color if newColor is defined
      opacity: newOpacity !== undefined ? newOpacity : selectedShape.opacity, // Update opacity if newOpacity is defined
      width: newWidth !== undefined ? newWidth : selectedShape.width, // Only update width if newWidth is defined
      height: newHeight !== undefined ? newHeight : selectedShape.height, // Only update height if newHeight is defined
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);
  }
};



const updateFilledCircle = (newOpacity:any, newRadius:any, newColor:any) => { 
  if (selectedShape && selectedShape.type === 'filledCircle') {
    const updatedShape = {
      ...selectedShape,
      background: newColor !== undefined ? newColor : selectedShape.background, // Update fill color
      opacity: newOpacity !== undefined ? newOpacity : selectedShape.opacity, 
      r: newRadius !== undefined ? newRadius : selectedShape.r, 
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);
  }
};



const updateLine = () => {
  if (selectedShape && selectedShape.type === 'line') {
    const updatedShape = {
      ...selectedShape,
      color: strokeColor, // Update the line color
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);

    
  }
};

const updateRectangle = (newColor:any, newWidth:any, newHeight:any) => {
  if (selectedShape && selectedShape.type === 'rectangle') {
    const updatedShape = {
      ...selectedShape,
      color: newColor !== undefined ? newColor : selectedShape.stroke, // Update the stroke color
      width: newWidth !== undefined ? newWidth : selectedShape.width, 
      height: newHeight !== undefined ? newHeight : selectedShape.height, 
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);
  }
};


const updatePath = (newOpacity: any, newColor: any) => {
  if (selectedShape && selectedShape.type === 'path') {
    const updatedShape = {
      ...selectedShape,
      background: newColor || selectedShape.background,
      opacity: newOpacity !== undefined ? newOpacity : selectedShape.opacity,
      stroke: newColor || selectedShape.stroke
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);
  }
};

const updateCircle = (newColor:any, newRadius:any) => {
  if (selectedShape && selectedShape.type === 'circle') {
    const updatedShape = {
      ...selectedShape,
      color: newColor !== undefined ? newColor : selectedShape.stroke, // Update the stroke color
      r: newRadius !== undefined ? newRadius : selectedShape.r, // Update the radius
    };

    const updatedShapes = shapes.map((shape) =>
      shape.id === updatedShape.id ? updatedShape : shape
    );

    setShapes(updatedShapes);
    setSelectedShape(null);
  }
};


const updateTitle = () => {
  if (selectedTitleShape) {
      const updatedShape = {
          ...selectedTitleShape,
          text: titleText,
          color: titleColor,
          size: titleSize,
          fillColor: fillColor,
          opacity: 0,
          background: titleBackground,
          type: selectedTitleShape.type,
          stroke: '',  
          width: 0,    
          r: 0,        
          height: 0,   
          category: '', 
      };

      const updatedShapes = shapes.map((shape) =>
          shape.id === updatedShape.id ? updatedShape : shape
      );

      setShapes(updatedShapes);
      setSelectedShape(updatedShape); 

      resetTitleInput();
      setShowInput(false);
      setIsUpdatingTitle(false);
      setShapeType('select');
  }
};




// Input alanlarını sıfırlayan fonksiyon
const resetTitleInput = () => {
  setTitleText('');
  setTitleColor('#000000'); // Default color
  setTitleSize(16); 
  setTitleBackground('#000000'); 
  setSelectedTitleShape(null);
  setIsUpdatingTitle(false);
};



useEffect(() => {
  const svgElement = svgRef.current;
  const drawLayer = drawLayerRef.current;

  if (!svgElement || !drawLayer) return;
  
  const svg = d3.select<SVGSVGElement, unknown>(svgElement)
    .attr('class', 'fixed') 
    .style('border', 'none'); // Remove border styling

  // data is coming with X and Y values in the range [0, 1]
  const xScale = d3.scaleLinear()
    .domain([0, 1]) // Domain set to [0, 1]
    .range([40, 1920 - 40]); // Map to the width of the svg

  const yScale = d3.scaleLinear()
    .domain([0, 1]) // Domain set to [0, 1]
    .range([1080 - 40, 40]); // Map to the height of the svg
    
  
  const zoom = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
      const transform = event.transform;
      setZoomTransform(transform);

      const newXScale = transform.rescaleX(xScale);
      const newYScale = transform.rescaleY(yScale);

      // Apply the zoom transformation to the draw layer
      d3.select(drawLayer).attr('transform', transform);

      // Apply the zoom transformation to the node layer
      svg.select('g.node-layer').attr('transform', transform);
       tooltip.style("visibility", "hidden");
    });

   svg.on('click', (event) => {
  // Get the mouse position relative to the SVG element
  const [mouseX, mouseY] = d3.pointer(event, svgElement);
  const transformedPoint = zoomTransform.invert([mouseX, mouseY]);

  // Normalize the mouse position based on the current zoom transform
  const normalizedX = (transformedPoint[0] - 40) / (width - 80);  // Assuming padding of 40px on each side.. it is assumption, future dev's can change that value later if its needed..
  const normalizedY = (height-80 - (transformedPoint[1] - 40)) / (height - 80); // Invert the Y-axis to make it correct

  // Log the normalized coordinates to the console
  console.log(`Normalized Coordinates: X: ${normalizedX}, Y: ${normalizedY}`);
});



// Definition of the ToolTip 
const tooltip = d3.select("body").append("div")
  .attr("class", "tooltip")
  .style("position", "absolute")
  .style("visibility", "hidden")
  .style("pointer-events", "none")
  .attr("class", "bg-white text-gray-800 text-sm shadow-lg rounded-lg px-4 py-2 border border-gray-300")
  .attr("id", "unique-tooltip"); // unique id for tooltip, it is not necessary but added..

// Enabling tooltip Function
const enableTooltip = () => {
  svg.selectAll<SVGCircleElement, DataPoint>('g.node-layer circle.node')
    .on('mouseover', (event, d) => {
      // Her mouseover olayında önceki tooltip'i gizle
      d3.selectAll("#unique-tooltip").style("visibility", "hidden");

      tooltip.style("visibility", "visible")
        .html(`<strong>Node Info:</strong><br/>
               ID: ${d.Data_Id}<br/>
               Label: ${d.Label || 'N/A'}<br/>
               Size: ${d.Size}<br/>
               Color: <span style="color: ${d.Color};">${d.Color}</span><br/>
               X: ${d.X}<br/>
               Y: ${d.Y}<br/>
               Level1: ${d.Level1}<br/>
               Custom_Filter : ${d.Custom_Filter}<br/>
               Pageranks : ${d.Pageranks}<br/>
               Modularity Class: ${d.Modularity_Class}<br/>
               Category ${d.Category}`)
        .style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on('mousemove', (event) => {
      tooltip.style("left", `${event.pageX + 10}px`)
        .style("top", `${event.pageY - 28}px`);
    })
    .on('mouseout', () => {
      tooltip.style("visibility", "hidden"); 
    });

  // mouse movements on tooltip 
  tooltip
    .on('mouseover', () => {
      tooltip.style("visibility", "visible"); // when we on the tooltip via mouse cursor, make it visible..
    })
    .on('mouseout', () => {
      tooltip.style("visibility", "hidden"); // hide tooltip when we get out of the area of the tooltip 
    });
};




// func. to deactivate tooltip 
const disableTooltip = () => {
  svg.selectAll<SVGCircleElement, DataPoint>('g.node-layer circle.node')
    .on('mouseover', null)
    .on('mousemove', null)
    .on('mouseout', null);
};

// Apply zoom behavior based on draw mode
if (!drawMode) {
  svg.call(zoom);
  enableTooltip(); // activate TooolTip 
  setShapeType(null); // in order to drop the drawing tool when we close the drawMode
  
} else {
  svg.on('.zoom', null); // Disable zooming while in draw mode
  disableTooltip(); // disable tooltip
}


// Shapeslerin Ortak özelliklerini ayarlamak için 
const setCommonAttributes = (element:any, shape:any, isSelected:any) => {
  element.attr('id', shape.id)
         .attr('stroke', isSelected ? 'red' : shape.color); 
};

// FilledShapeslerin Ortak özellikleri ayarlamak için 
const setCommonForFilleds = (element:any, shape:any, isSelected:any) => {
  element.attr('id', shape.id)
         .attr('fill', isSelected ? 'red' : shape.background || 'none'); 

};

let isDragging = false; // state of dragging.. 

const dragShape = (shape: Shape) => {
  return d3.drag<SVGTextElement, Shape>()

    .on('start', (event: any) => {
      // Eğer kategorisi varsa, sürüklemeyi engelle !!!!
      if (shape.category) {
        console.log(`Shape with category "${shape.category}" cannot be dragged.`);
        return;
      }
      d3.select(event.sourceEvent.target).raise().classed('active', true); // Raise the element on drag start
    })
    .on('drag', (event: any) => {
      // Eğer kategorisi varsa, sürüklemeyi engelle !!!!!
      if (shape.category) {
        return;
      }
      
      // Update the shape's position based on the drag event
      if (shape.type === 'filledRectangle' || shape.type === 'rectangle') {
        shape.x += event.dx; 
        shape.y += event.dy; 
      } else if (shape.type === 'filledCircle' || shape.type === 'circle') {
        shape.cx += event.dx; 
        shape.cy += event.dy; 
      } else if (shape.type === 'line') {
        shape.x1 += event.dx; 
        shape.y1 += event.dy; 
        shape.x2 += event.dx; 
        shape.y2 += event.dy; 
      } else if (shape.type === 'title' && shape.position) { 
        shape.position.x += event.dx; 
        shape.position.y += event.dy; 
      }
      renderShapes(); 
    })
    .on('end', (event: any) => {
      if (!shape.category) {
        d3.select(event.sourceEvent.target).classed('active', false); // Remove active class on drag end
      }
    });
};


const addResizeHandles = (shape: any) => {
  const handleSize = 8; // Size of the handle squares

  // If the shape has a category, do not add resize handles
  if (shape.category) {
    return; // Exit the function if the shape has a category
  }

  let corners: { x: number, y: number, cursor: string }[] = []; 

  if (shape.type === 'filledRectangle' || shape.type === 'rectangle') {
    // For rectangle and filledRectangle, corners used
    corners = [
      { x: shape.x, y: shape.y, cursor: 'nw-resize' },                     // Top-left
      { x: shape.x + shape.width, y: shape.y, cursor: 'ne-resize' },        // Top-right
      { x: shape.x, y: shape.y + shape.height, cursor: 'sw-resize' },       // Bottom-left
      { x: shape.x + shape.width, y: shape.y + shape.height, cursor: 'se-resize' } // Bottom-right
    ];
  } else if (shape.type === 'filledCircle' || shape.type === 'circle') {
    // For circle and filledCircle
    corners = [
      { x: shape.cx - shape.r, y: shape.cy, cursor: 'ew-resize' }, // Left-center
      { x: shape.cx + shape.r, y: shape.cy, cursor: 'ew-resize' }, // Right-center
      { x: shape.cx, y: shape.cy - shape.r, cursor: 'ns-resize' }, // Top-center
      { x: shape.cx, y: shape.cy + shape.r, cursor: 'ns-resize' }  // Bottom-center
    ];
  } else if (shape.type === 'line') {
    // For line, allow resizing at both ends
    corners = [
      { x: shape.x1, y: shape.y1, cursor: 'nw-resize' }, // Start point
      { x: shape.x2, y: shape.y2, cursor: 'se-resize' }  // End point
    ];
  }

  corners.forEach((corner, index) => {
    d3.select(drawLayer)
      .append('rect') // Draw a small square to the edges of the shape, in order to make it visible to the users to indicate where they should click to resize shape, v.b.
      .attr('x', corner.x - handleSize / 2) // Center the square at the corner
      .attr('y', corner.y - handleSize / 2)
      .attr('width', handleSize) 
      .attr('height', handleSize)
      .attr('fill', 'black') 
      .attr('stroke', 'white') 
      .attr('stroke-width', 1.5) 
      .style('cursor', corner.cursor)
      .call(d3.drag<SVGRectElement, any>().on('drag', (event) => resizeShape(event, shape, index))); 
  });
};



const resizeShape = (event:any, shape:any, cornerIndex:any) => {
  let newWidth = shape.width;
  let newHeight = shape.height;
  let newX = shape.x;
  let newY = shape.y;
  let newRadius = shape.r;

  switch (shape.type) {
    case 'filledRectangle':
    case 'rectangle':
      // For rectangles, adjust width and height
      switch (cornerIndex) {
        case 0: // Top-left
          newWidth = shape.width + (shape.x - event.x);
          newHeight = shape.height + (shape.y - event.y);
          newX = event.x;
          newY = event.y;
          break;
        case 1: // Top-right
          newWidth = event.x - shape.x;
          newHeight = shape.height + (shape.y - event.y);
          newY = event.y;
          break;
        case 2: // Bottom-left
          newWidth = shape.width + (shape.x - event.x);
          newHeight = event.y - shape.y;
          newX = event.x;
          break;
        case 3: // Bottom-right
          newWidth = event.x - shape.x;
          newHeight = event.y - shape.y;
          break;
      }
      break;

    case 'filledCircle':
case 'circle':
  switch (cornerIndex) {
    case 0: // Left
      newRadius = (shape.cx - event.x); 
      newX = event.x; 
      break;
    case 1: // Right
      newRadius = event.x - shape.cx;
      break;
    case 2: // Top
      newRadius = (shape.cy - event.y); 
      newY = event.y; 
      break;
    case 3: // Bottom
      newRadius = event.y - shape.cy;
      break;
  }
  break;


    case 'line':
      // For lines, adjust the endpoints
      switch (cornerIndex) {
        case 0: // Start point
          newWidth = event.x - shape.x1;
          newHeight = event.y - shape.y1;
          break;
        case 1: // End point
          newWidth = event.x - shape.x1;
          newHeight = event.y - shape.y1;
          break;
      }
      break;

    default:
      return;
  }

  // below if code block for ensuring minimum size (radius for circle and dimensions for rectangle/line etc)
  if (shape.type === 'line') {
    shape.x2 = shape.x1 + newWidth;
    shape.y2 = shape.y1 + newHeight;
  } else if (shape.type === 'circle' || shape.type === 'filledCircle') {
    shape.r = Math.max(10, newRadius); // Minimum radius
  } else {
    shape.width = Math.max(10, newWidth); // Minimum width
    shape.height = Math.max(10, newHeight); // Minimum height
  }

  
  if (shape.type !== 'line') {
    shape.x = newX;
    shape.y = newY;
  }

  // Update the state
  const updatedShapes = shapes.map((s) => (s.id === shape.id ? shape : s));
  setShapes(updatedShapes);
  setSelectedShape(shape);

  // Redraw to reflect changes
  renderShapes();
};



// Updated renderShapes function
const renderShapes = () => {
  d3.select(drawLayer).selectAll('*').remove(); // Clear previous shapes
  if (!Array.isArray(shapes)) {
    console.error('shapes is not defined or not an array');
    return; // Exit if shapes array is not defined
  }
  shapes.forEach((shape) => {
    const isSelected = shape === selectedShape;
    let element: any;

    // Filled Rectangle
    if (shape.type === 'filledRectangle') {
      element = d3.select(drawLayer)
        .append('rect')
        .attr('x', shape.x)
        .attr('y', shape.y)
        .attr('width', shape.width)
        .attr('height', shape.height)
        .attr('fill', shape.background || fillColor)
        .attr('pointer-events', 'all')
        .attr('opacity', shape.opacity || filledRectangleOpacity);

      setCommonAttributes(element, shape, isSelected);
      setCommonForFilleds(element, shape, isSelected);

      if (shapeType === 'select') {
        element.on('click', (event: any) => {
          console.log("type degeri : " + shapeType);
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
            setShowInput(true);
          } 
        });
      } else if (shapeType === 'title'){
        handleSvgClick(event);
      


      } 

      // Apply drag behavior
      if (shapeType === 'drag-shape') {
        element.call(dragShape(shape)); // Add drag behavior
      }

      if (isSelected) {
        addResizeHandles(shape);
      }
    }
    
    
    // Empty Rectangle
    else if (shape.type === 'rectangle') {
      element = d3.select(drawLayer)
        .append('rect')
        .attr('x', shape.x)
        .attr('y', shape.y)
        .attr('width', shape.width)
        .attr('height', shape.height)
        .attr('pointer-events', 'all')
        .attr('fill', 'none')
        .attr('color', shape.stroke || '#000000'); 

      setCommonAttributes(element, shape, isSelected);
      if (shapeType === 'select') {
        element.on('click', (event: any) => {
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
            setShowInput(true);
          } else {
            setShowInput(true);
            handleSvgClick(event);
          }
        });
      } else {
        element.on('click', null);
      }
      // Apply drag behavior
      if (shapeType === 'drag-shape' && drawMode) {
        element.call(dragShape(shape)); // Add drag behavior
      }
      if (isSelected) {
        addResizeHandles(shape);
      }
    }

    // Filled Circle
    else if (shape.type === 'filledCircle') {
      element = d3.select(drawLayer)
        .append('circle')
        .attr('cx', shape.cx)
        .attr('cy', shape.cy)
        .attr('r', shape.r)
        .attr('fill', shape.background || fillColor)
        .attr('pointer-events', 'all')
        .attr('opacity', shape.opacity || filledCircleOpacity);

      setCommonAttributes(element, shape, isSelected);
      setCommonForFilleds(element, shape, isSelected);

      if (shapeType === 'select' || shapeType === 'title') {
        element.on('click', (event: any) => {
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
          } else {
            setShowInput(true);
            handleSvgClick(event);
          }
        });
      } else {
        element.on('click', null);
      }
      // Apply drag behavior
      if (shapeType === 'drag-shape') {
        element.call(dragShape(shape)); // Add drag behavior
      }
      if (isSelected) {
        addResizeHandles(shape);
      }
    }

    // Empty Circle
    else if (shape.type === 'circle') {
      element = d3.select(drawLayer)
        .append('circle')
        .attr('cx', shape.cx)
        .attr('cy', shape.cy)
        .attr('r', shape.r)
        .attr('pointer-events', 'all')
        .attr('fill', 'none')
        .attr('color', shape.stroke || '#000000'); 

      setCommonAttributes(element, shape, isSelected);
      if (shapeType === 'select') {
        element.on('click', (event: any) => {
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
          }
        });
      } else {
        element.on('click', null);
      }
      // Apply drag behavior
      if (shapeType === 'drag-shape') {
        element.call(dragShape(shape)); // Add drag behavior
      }
      if (isSelected) {
        addResizeHandles(shape);
      }
    }

    // Line
    else if (shape.type === 'line') {
      element = d3.select(drawLayer)
        .append('line')
        .attr('x1', shape.x1)
        .attr('y1', shape.y1)
        .attr('x2', shape.x2)
        .attr('y2', shape.y2)
        .attr('pointer-events', 'all')
        .attr('stroke-width', 2)
        .attr('color', shape.stroke || '#000000'); // Set stroke color

      setCommonAttributes(element, shape, isSelected);

      if (shapeType === 'select') {
        element.on('click', (event: any) => {
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
          } else {
            setShowInput(true);
            handleSvgClick(event);
          }
        });
      } else {
        element.on('click', null);
      }

      // Apply drag behavior
      if (shapeType === 'drag-shape') {
        element.call(dragShape(shape)); // Add drag behavior
      }
      if (isSelected) {
            addResizeHandles(shape);
          }
    }

    else if (shape.type === 'path') {
      element = d3.select(drawLayer)
        .append('path')
        .attr('d', shape.d)
        .attr('fill', shape.background)
        .attr('stroke', shape.stroke)
        .attr('opacity', shape.opacity)
        .attr('pointer-events', 'all');

      setCommonAttributes(element, shape, isSelected);
      setCommonForFilleds(element, shape, isSelected);

      //  Seçim işlemleri için event handlers
      if (shapeType === 'select') {
        element.on('click', (event: any) => {
          setSelectedShape(shape);
          highlightShape(shape);
          setShowInput(true);
        });
      }

      // Drag behavioır..
      if (shapeType === 'drag-shape') {
        element.call(dragShape(shape));
      }

      if (isSelected) {
        addResizeHandles(shape);
      }
    }


    // Title
    else if (shape.type === 'title') {
      const padding = 10;
      const textElement = d3.select(drawLayer)
        .append('text')
        .attr('x', shape.position.x)
        .attr('y', shape.position.y)
        .attr('font-size', `${shape.size}px`)
        .attr('fill', isSelected ? 'red' : shape.color)
        .attr('pointer-events', 'all')
        .text(shape.text);
    
      if (shapeType === 'select') {
        textElement.on('click', (event) => {
          if (shapeType === 'select') {
            setSelectedShape(shape);
            highlightShape(shape);
            setTitleText(shape.text);
            setTitleColor(shape.color);
            setTitleSize(shape.size);
            setTitleBackground(shape.background);
            setSelectedTitleShape(shape);
            setIsUpdatingTitle(true);
            setShowInput(true);
          }
        });
      } else {
        textElement.on('click', null);
      }
    
      // Get bounding box of text
      const textBBox = textElement.node()?.getBBox();
      if (!textBBox) return; // Handle null case
    
      d3.select(drawLayer)
        .insert('rect', ':first-child')
        .attr('x', textBBox.x - padding / 2)
        .attr('y', textBBox.y - padding / 2)
        .attr('width', textBBox.width + padding)
        .attr('height', textBBox.height + padding)
        .attr('fill', shape.background || 'white')
        .attr('opacity', 0.3)
        .attr('rx', 5)
        .attr('pointer-events', 'all')
        .attr('ry', 5);
      
      // Applying drag behavior
  if (shapeType === 'drag-shape') {
    const textNode = textElement.node(); // Get the actual SVGTextElement
    if (textNode) { // Check if it's not null...
      const textElementSelection = d3.select<SVGTextElement, Shape>(textNode);
      textElementSelection.call(dragShape(shape));
    }
  }
}
  });
};





const renderNodes = () => {
  const nodeLayer = svg.select<SVGSVGElement>('g.node-layer');

  // Eğer node-layer yoksa ekle
  if (nodeLayer.empty()) {
    svg.append('g').attr('class', 'node-layer');
  }

  // data
  const parsedData = data.map(d => ({
    ...d,
    ID: parseInt(d.Data_Id),
    X: parseFloat(d.X),
    Y: parseFloat(d.Y),
    Size: isNaN(parseFloat(d.Size)) || parseFloat(d.Size) <= 0 ? 0 : parseFloat(d.Size),
    Modularity_Class: d.Modularity_Class,
    Category: d.Category,
    Label: d.Label,  
    Pageranks:parseFloat(d.Pageranks),
    Level1:d.Level1,
    Custom_Filter: d.Custom_Filter,

  }));

  // filter the data..
  const filteredData = parsedData.filter(d => selectedModularityClasses.has(d.Modularity_Class) && d.Label && d.Label.length > 0);

  const hasHighlightedLabel = highlightedLabel && highlightedLabel.length > 0;

  // Render Nodes 
  nodeLayer.selectAll('circle.node')
    .data(filteredData)
    .join('circle')
    .attr('class', 'node')
    .attr('r', d => d.Size * nodeSize * 10)
    .attr('fill', d => d.Size > 0 ? d.Color : 'none')
    .attr('cx', d => xScale(d.X))
    .attr('cy', d => yScale(d.Y))
    
    .style('opacity', d => {
      if (highlightedLabel && highlightedLabel.length > 0) { // Check if highlightedLabel is not null and has a length
        // Check if d.Label is defined before using it
        return d.Label && highlightedLabel.includes(d.Label) ? 1 : 0.05;
      }
      return 1;  // Default opacity for all nodes when no label is highlighted
    })
    
    .on('click', (event, d) => {
      const instagramUrl = `https://www.instagram.com/${d.Label}/`;
      window.open(instagramUrl, '_blank');
    });

  // If PIN checkbox selected, render the PIN on the plot 
  const nodesWithArrows = filteredData.filter(d => d.Level1 === 'true');

  if (showPins) {
    nodeLayer.selectAll('image.pin')
      .data(nodesWithArrows)
      .join('image')
      .attr('class', 'pin')
      .attr('href', d => `/${selectedPinImage}.png`) // seleccted PIN's path 
      .attr('x', d => xScale(d.X) - 12)
      .attr('y', d => yScale(d.Y) - 27)
      .attr('width', 24)
      .attr('height', 24);
  } else {
    // Hide PINs
    nodeLayer.selectAll('image.pin').remove();
  }

  // If "Label" checkBox is Ticked- means selected, render labels..
  if (showLabels) {
    nodeLayer.selectAll('text.node-label')
      .data(filteredData.filter(d => d.Label))
      .join('text')
      .attr('class', 'node-label')
      .attr('x', d => xScale(d.X))  // X position will be on the center of the nodes 
      .attr('y', d => yScale(d.Y))  // Y position
      .attr('text-anchor', 'middle')
      .attr('font-size', labelSize)
      .text(d => d.Label || '')
      .style('opacity', d => {
        if (highlightedLabel && highlightedLabel.length > 0) { // Check if highlightedLabel is not null and has a length
          // Check if d.Label is defined before using it
          return d.Label && highlightedLabel.includes(d.Label) ? 1 : 0.05;
        }
        return 1;  // Default opacity for all nodes when no label is highlighted
      })
      .style('fill', labelColor); 
      
  } else {
    // hide labels
    nodeLayer.selectAll('text.node-label').remove();
  }
};



  renderShapes(); // Render shapes
  renderNodes();  // Render nodes

  const startDrawing = (event: any) => {
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transformedPoint = d3.zoomTransform(svgElement).invert([mouseX, mouseY]);
    
    if (shapeType === 'rectangle' || shapeType === 'filledRectangle') {
      setRectStart({ x: transformedPoint[0], y: transformedPoint[1] });
    } else if (shapeType === 'circle' || shapeType === 'filledCircle') {
      setCircleStart({ x: transformedPoint[0], y: transformedPoint[1] });
    } else if (shapeType === 'line') {
      setLineStart({ x: transformedPoint[0], y: transformedPoint[1] });
    } else if (shapeType === 'title') {
      setTitlePosition({ x: transformedPoint[0], y: transformedPoint[1] });
      setShowInput(true); // Show the input field for title
    }
  };
  
  const drawing = (event: any) => {
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transformedPoint = d3.zoomTransform(svgElement).invert([mouseX, mouseY]);
  
    setMousePosition({ x: transformedPoint[0], y: transformedPoint[1] });
  
    renderShapes(); // draw temporary shape for visual effect for the users.. drawing showing the users what they are currenly drawing..
    
    // Rectangle
    if (shapeType === 'rectangle' && rectStart) {
      const [rectWidth, rectHeight] = [mousePosition.x - rectStart.x, mousePosition.y - rectStart.y];
      d3.select(drawLayer)
        .append('rect')
        .attr('x', rectStart.x)
        .attr('y', rectStart.y)
        .attr('width', Math.abs(rectWidth))
        .attr('height', Math.abs(rectHeight))
        .attr('fill', 'none')
        .attr('stroke', 'black');
    }
  
    // Filled Rectangle
    if (shapeType === 'filledRectangle' && rectStart) {
      const [rectWidth, rectHeight] = [mousePosition.x - rectStart.x, mousePosition.y - rectStart.y];
      d3.select(drawLayer)
        .append('rect')
        .attr('x', rectStart.x)
        .attr('y', rectStart.y)
        .attr('width', Math.abs(rectWidth))
        .attr('height', Math.abs(rectHeight))
        .attr('fill', 'black') // fill inside
        .attr('opacity', 0.1)
        .attr('stroke', 'black');
  
    }
  
    // Circle
    if (shapeType === 'circle' && circleStart) {
      const radius = Math.sqrt(Math.pow(mousePosition.x - circleStart.x, 2) + Math.pow(mousePosition.y - circleStart.y, 2));
      d3.select(drawLayer)
        .append('circle')
        .attr('cx', circleStart.x)
        .attr('cy', circleStart.y)
        .attr('r', radius)
        .attr('fill', 'none')
        .attr('stroke', 'black');
    }
  
    // Filled Circle
    if (shapeType === 'filledCircle' && circleStart) {
      const radius = Math.sqrt(Math.pow(mousePosition.x - circleStart.x, 2) + Math.pow(mousePosition.y - circleStart.y, 2));
      d3.select(drawLayer)
        .append('circle')
        .attr('cx', circleStart.x)
        .attr('cy', circleStart.y)
        .attr('r', radius)
        .attr('fill', 'black') // fill inside 
        .attr('opacity', 0.1)
        .attr('stroke', 'black');
    }
  
    // Line
    if (shapeType === 'line' && lineStart) {
      d3.select(drawLayer)
        .append('line')
        .attr('x1', lineStart.x)
        .attr('y1', lineStart.y)
        .attr('x2', mousePosition.x)
        .attr('y2', mousePosition.y)
        .attr('stroke', 'black');
    }
  };

  const generateRandomId = () => {
    return 'shape-' + Math.random().toString(36).substr(2, 9); // Generates a random string
};

const endDrawing = () => {
  if (shapeType === 'rectangle' && rectStart) {
    const [rectWidth, rectHeight] = [mousePosition.x - rectStart.x, mousePosition.y - rectStart.y];
    setShapes([...shapes, {
      id: generateRandomId(), 
      type: 'rectangle', 
      x: rectStart.x, 
      y: rectStart.y, 
      width: Math.abs(rectWidth), 
      height: Math.abs(rectHeight), 
      color: drawColor // Set color once when the shape is created
    }]);
    setRectStart(null);
  } else if (shapeType === 'filledRectangle' && rectStart) {
    const [rectWidth, rectHeight] = [mousePosition.x - rectStart.x, mousePosition.y - rectStart.y];
    setShapes([...shapes, {
      id: generateRandomId(), 
      type: 'filledRectangle', 
      x: rectStart.x, 
      y: rectStart.y, 
      width: Math.abs(rectWidth), 
      height: Math.abs(rectHeight), 
      background: drawColor // Set background once for filled shapes
    }]);
    setRectStart(null);
  } else if (shapeType === 'circle' && circleStart) {
    const radius = Math.sqrt(Math.pow(mousePosition.x - circleStart.x, 2) + Math.pow(mousePosition.y - circleStart.y, 2));
    setShapes([...shapes, {
      id: generateRandomId(), 
      type: 'circle', 
      cx: circleStart.x, 
      cy: circleStart.y, 
      r: radius, 
      color: drawColor // Set color once when the shape is created
    }]);
    setCircleStart(null);
  } else if (shapeType === 'filledCircle' && circleStart) {
    const radius = Math.sqrt(Math.pow(mousePosition.x - circleStart.x, 2) + Math.pow(mousePosition.y - circleStart.y, 2));
    setShapes([...shapes, {
      id: generateRandomId(), 
      type: 'filledCircle', 
      cx: circleStart.x, 
      cy: circleStart.y, 
      r: radius, 
      background: drawColor 
    }]);
    setCircleStart(null);
  } else if (shapeType === 'line' && lineStart) {
    setShapes([...shapes, {
      id: generateRandomId(), 
      type: 'line', 
      x1: lineStart.x, 
      y1: lineStart.y, 
      x2: mousePosition.x, 
      y2: mousePosition.y, 
      color: drawColor 
    }]);
    setLineStart(null);
  }

  renderShapes();
};



let lassoPath: [number, number][] = []; 
let boxStart: { x: number; y: number } | null = null; 
let boxEnd: { x: number; y: number } | null = null;

let circleCenter: { x: number; y: number } | null = null; 
let circleRadius: number = 0; 


svg.on('mousedown', (event) => {
  if (drawMode && shapeType === 'lasso') {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transform = d3.zoomTransform(svgElement);
    const transformedX = transform.invertX(mouseX);
    const transformedY = transform.invertY(mouseY);
    lassoPath = [[mouseX, mouseY]]; 
    renderLassoSelection(svg);
    setCpose({ x: transformedX, y: transformedY });

  }else if (drawMode && shapeType === 'filledCircleSelect') {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transform = d3.zoomTransform(svgElement);
    const transformedX = transform.invertX(mouseX);
    const transformedY = transform.invertY(mouseY);
    circleCenter = { x: mouseX, y: mouseY };
    circleRadius = 0; 
    setCpose({ x: transformedX, y: transformedY });
  } else if (drawMode && shapeType === 'box') {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    const transform = d3.zoomTransform(svgElement);
    const transformedX = transform.invertX(mouseX);
    const transformedY = transform.invertY(mouseY);
    boxStart = { x: mouseX, y: mouseY }; 
    setCpose({ x: transformedX, y: transformedY });
  }

  if (drawMode && shapeType==='line' || shapeType==='rectangle' || shapeType==='circle' || shapeType==='filledRectangle' || shapeType==='filledCircle' || shapeType==='title'){
    event.preventDefault();
    startDrawing(event);
  }
});



svg.on('mousemove', (event) => {
  if (drawMode && shapeType === 'lasso' && lassoPath.length > 0) {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    lassoPath.push([mouseX, mouseY]);
    renderLassoSelection(svg); 
  }else if (drawMode && shapeType === 'filledCircleSelect' && circleCenter) {
    event.preventDefault();
    const [mouseX, mouseY] = d3.pointer(event, svgElement);
    circleRadius = Math.sqrt(
      Math.pow(mouseX - circleCenter.x, 2) + Math.pow(mouseY - circleCenter.y, 2)
    );
    renderFilledCircleSelection(svg); 
  } 
  else if (drawMode && shapeType === 'box' && boxStart) {
    const [mouseX, mouseY] = d3.pointer(event);
    boxEnd = { x: mouseX, y: mouseY }; 
    renderBoxSelection(svg); 
  }

  if (drawMode && shapeType==='line' || shapeType==='rectangle' || shapeType==='circle' || shapeType==='filledRectangle' || shapeType==='filledCircle' || shapeType==='title'){
    event.preventDefault();
    drawing(event);
  }

  
});


svg.on('mouseup', () => {
  if (drawMode && shapeType === 'lasso' && lassoPath.length > 0) {
    highlightNodesInsideLasso(); //Highlight nodes within Lasso
    lassoPath = []; // Reset Lasso path
    svg.selectAll('path.lasso-selection').remove(); 
  }else if (drawMode && shapeType === 'filledCircleSelect' && circleCenter) {
    highlightNodesInsideFilledCircle(); 
    circleCenter = null;
    circleRadius = 0;
    svg.selectAll('circle.selection-circle').remove(); 
  }else if (drawMode && shapeType === 'box' && boxStart) {
    highlightNodesInsideBox(); 
    boxStart = null;
    boxEnd = null;
    svg.selectAll('rect.selection-box').remove(); 
  }

  if (drawMode && shapeType==='line' || shapeType==='rectangle' || shapeType==='circle' || shapeType==='filledRectangle' || shapeType==='filledCircle' || shapeType==='title'){
    endDrawing();
  }
});


const renderFilledCircleSelection = (svg: any) => {
  svg.selectAll('circle.selection-circle').remove(); 

  if (circleCenter && circleRadius > 0) {
    
    svg.append('circle')
      .attr('class', 'selection-circle')
      .attr('cx', circleCenter.x)
      .attr('cy', circleCenter.y)
      .attr('r', circleRadius)
      .attr('fill', 'rgba(0, 0, 255, 0.2)')  
      .attr('stroke', 'blue')  
      .attr('stroke-width', 1);
  }
};



const highlightNodesInsideFilledCircle = () => {
  if (!circleCenter || circleRadius <= 0 || !zoomTransform) return;

  const nodeLayer = svg.select('g.node-layer');

  // Invert the circle center to get the correct position in the original coordinate space
  const invertedCenter = zoomTransform.invert([circleCenter.x, circleCenter.y]);
  const invertedRadius = circleRadius / zoomTransform.k; // Invert the radius by dividing by zoom level

  
  nodeLayer.selectAll<SVGCircleElement, DataPoint>('circle.node')
    .style('opacity', (d: DataPoint) => {
      const nodeX = xScale(parseFloat(d.X));
      const nodeY = yScale(parseFloat(d.Y));
      const distance = Math.sqrt(Math.pow(nodeX - invertedCenter[0], 2) + Math.pow(nodeY - invertedCenter[1], 2));
      return distance <= invertedRadius ? 1 : 0.1;
    });

  nodeLayer.selectAll<SVGTextElement, DataPoint>('text.node-label')
    .style('opacity', (d: DataPoint) => {
      const nodeX = xScale(parseFloat(d.X));
      const nodeY = yScale(parseFloat(d.Y));
      const distance = Math.sqrt(Math.pow(nodeX - invertedCenter[0], 2) + Math.pow(nodeY - invertedCenter[1], 2));
      return distance <= invertedRadius ? 1 : 0.1;
    });

  const highlighted = nodeLayer.selectAll<SVGCircleElement, DataPoint>('circle.node')
  .filter((d: DataPoint) => {
    const nodeX = xScale(parseFloat(d.X));
    const nodeY = yScale(parseFloat(d.Y));
    const distance = Math.sqrt(Math.pow(nodeX - invertedCenter[0], 2) + Math.pow(nodeY - invertedCenter[1], 2));

    
    return d.Label !== undefined && d.Label !== "" && distance <= invertedRadius;
  })
  .data();
  

  
  const newShape = {
    id: generateRandomId(),
    type: 'filledCircle',  
    cx: invertedCenter[0],
    cy: invertedCenter[1],
    r: invertedRadius,
    background: drawColor,
    opacity: 0.1,
    stroke: drawColor,
    fill: drawColor,  
    category:'',  
    nodeIds: highlighted.map((node) => node.ID), 
  };

  // Update the last added shape ID
  setLastAddedCategoryShapeID(newShape.id);


  setShapes(prevShapes => [...prevShapes, newShape]);

  setHighlightedNodes(highlighted);
  setShowInfoPanel(true);
  setShowCategoryInput(true);

  renderShapes();  
};



// Lasso path rendering for visual effect for the user
const renderLassoSelection = (svg: any) => {
  if (lassoPath.length > 0) {
    const lineGenerator = d3.line();
    svg.selectAll('path.lasso-selection').remove(); // Remove previous lasso path
    svg.append('path')
      .attr('class', 'lasso-selection')
      .attr('d', lineGenerator(lassoPath) + 'Z') // Close path
      .attr('fill', 'rgba(0, 0, 255, 0.2)') 
      .attr('stroke', 'blue')
      .attr('stroke-width', 1);
  }
};

// highlight nodes in Lasso field
const highlightNodesInsideLasso = () => {
  if (lassoPath.length === 0 || !zoomTransform) return;

  
  const lassoPolygon = lassoPath.map(([x, y]) => zoomTransform.invert([x, y]));
  const lassoPathString = `M ${lassoPolygon.join(' L ')} Z`;

  const nodeLayer = svg.select('g.node-layer');

  
  nodeLayer.selectAll<SVGCircleElement, DataPoint>('circle.node')
    .style('opacity', (d: DataPoint) => {
      const nodeX = xScale(parseFloat(d.X));
      const nodeY = yScale(parseFloat(d.Y));
      return d3.polygonContains(lassoPolygon, [nodeX, nodeY]) ? 1 : 0.1;
    });

  nodeLayer.selectAll<SVGTextElement, DataPoint>('text.node-label')
    .style('opacity', (d: DataPoint) => {
      const nodeX = xScale(parseFloat(d.X));
      const nodeY = yScale(parseFloat(d.Y));
      return d3.polygonContains(lassoPolygon, [nodeX, nodeY]) ? 1 : 0.1;
    });

  const highlighted = nodeLayer.selectAll<SVGCircleElement, DataPoint>('circle.node')
  .filter((d: DataPoint) => {
    const nodeX = xScale(parseFloat(d.X));
    const nodeY = yScale(parseFloat(d.Y));

   
    return Boolean(d.Label) && d3.polygonContains(lassoPolygon, [nodeX, nodeY]);
  })
  .data();
  

  
  const newShape = {
    id: generateRandomId(),
    type: 'path',
    d: lassoPathString,
    background: drawColor,
    opacity: 0.1,
    stroke: drawColor,
    category: '', 
    nodeIds: highlighted.map((node) => node.ID),
  };

  // Update the last added shape ID
  setLastAddedCategoryShapeID(newShape.id);

  setShapes(prevShapes => [...prevShapes, newShape]);

  setHighlightedNodes(highlighted);
  setShowInfoPanel(true);
  setShowCategoryInput(true);

 
  renderShapes();
};



let selectionBox = {
  x: 0,
  y: 0,
  width: 0,
  height: 0,
};


// rendering drawing-box selection for visual effect of the user 
const renderBoxSelection = (svg: any) => {
  svg.selectAll('rect.selection-box').remove(); 

  if (boxStart && boxEnd) {
    selectionBox.x = Math.min(boxStart.x, boxEnd.x);
    selectionBox.y = Math.min(boxStart.y, boxEnd.y);
    selectionBox.width = Math.abs(boxStart.x - boxEnd.x);
    selectionBox.height = Math.abs(boxStart.y - boxEnd.y);

    setSelectionBoxInfo({
      x: Math.min(boxStart.x, boxEnd.x),
      y: Math.min(boxStart.y, boxEnd.y),
      width: Math.abs(boxStart.x - boxEnd.x),
      height: Math.abs(boxStart.y - boxEnd.y),
    });

    svg.append('rect')
      .attr('class', 'selection-box')
      .attr('x', selectionBox.x)
      .attr('y', selectionBox.y)
      .attr('width', selectionBox.width)
      .attr('height', selectionBox.height )
      .attr('fill', 'rgba(0, 0, 255, 0.2)') 
      .attr('stroke', 'blue')
      .attr('stroke-width', 1);
      
  }

  
};


const highlightNodesInsideBox = () => {
  if (!boxStart || !boxEnd || !zoomTransform) return;

  const xMin = Math.min(boxStart.x, boxEnd.x);
  const xMax = Math.max(boxStart.x, boxEnd.x);
  const yMin = Math.min(boxStart.y, boxEnd.y);
  const yMax = Math.max(boxStart.y, boxEnd.y);

  const [inverseXMin, inverseYMin] = zoomTransform.invert([xMin, yMin]);
  const [inverseXMax, inverseYMax] = zoomTransform.invert([xMax, yMax]);

  const nodeLayer = svg.select('g.node-layer');

  // find the nodes that are in the area...
  const highlightedNodes = nodeLayer
    .selectAll<SVGCircleElement, DataPoint>('circle.node')
    .filter((d: DataPoint) => {
      const nodeX = xScale(parseFloat(d.X));
      const nodeY = yScale(parseFloat(d.Y));
      const [svgX, svgY] = zoomTransform.apply([nodeX, nodeY]);
      return svgX >= xMin && svgX <= xMax && svgY >= yMin && svgY <= yMax;
    })
    .data();

  // new shape creation
  const newShape = {
    id: generateRandomId(),
    type: 'filledRectangle',
    x: inverseXMin,
    y: inverseYMin,
    width: Math.abs(inverseXMax - inverseXMin),
    height: Math.abs(inverseYMax - inverseYMin),
    background: drawColor,
    opacity: 0.1,
    stroke: drawColor,
    category: '',
    nodeIds: highlightedNodes.map((node) => node.ID), // related nodeIds 
  };

  // Update the last added shape ID
  setLastAddedCategoryShapeID(newShape.id);

  // save new shape
  setShapes((prevShapes) => [...prevShapes, newShape]);
  setHighlightedNodes(highlightedNodes);
  setShowInfoPanel(true);
  setShowCategoryInput(true);


};




  console.log('Current Transform:', zoomTransform); // DEBUG PURPOSE
  console.log('width:', width);
  console.log('height', height);

}, [data,  shapes,mousePosition,shapeType, svgRef, drawLayerRef, newXScale, newYScale,setZoomTransform,isDrawing, positionOFShapeAfterDrag, pathData, shapeType, selectedPinImage, rectStart, circleStart, shapes,selectedShape, showLabels, showPins, drawMode, zoomTransform, width , height, nodeSize, labelSize,labelColor, drawColor, fillColor, selectedColor, uniqueModularityClasses, selectedModularityClasses, searchLabel, highlightedLabel]); // Add necessary dependencies


    // handle keydown event
    const handleKeyDown = (event:any) => {
      if (event.key === 'Escape') {
          // Close the input box and set shape type to 'select'
          setShowInput(false);
          setShapeType('select'); // Reset shape type
          setIsAddingTitle(false);
          resetTitleInput();
          
      }
  };

  // Set up the event listener for keydown
  useEffect(() => {
      if (showInput) {
          window.addEventListener('keydown', handleKeyDown);
      }

      // Clean up the event listener on component unmount
      return () => {
          window.removeEventListener('keydown', handleKeyDown);
      };
  }, [showInput]); // Only add listener if showInput is true


  // Effect to extract unique Modularity_Class values and set them as selected
  useEffect(() => {
    const modularityClasses = Array.from(new Set(data.map(d => d.Modularity_Class)));
    setUniqueModularityClasses(modularityClasses);
    // Set all modularity classes as selected by default
    setSelectedModularityClasses(new Set(modularityClasses));
  }, [data]);



const handleModularityClassChange = (modularityClass:any) => {
  setSelectedModularityClasses((prev) => {
    const newSet = new Set(prev);
    if (newSet.has(modularityClass)) {
      newSet.delete(modularityClass); // Deselect the class
    } else {
      newSet.add(modularityClass); // Select the class
    }
    return newSet;
  });
};

  
const toggleSelectAll = () => {
  setSelectedModularityClasses((prev) =>
    prev.size === uniqueModularityClasses.length
      ? new Set() // Unselect all
      : new Set(uniqueModularityClasses) // Select all
  );
};

  const handleSearch = async () => {
    setSearchLoading(true); // Start the search loading
  
    // Remove leading and trailing spaces and replace multiple spaces with a single space
    const formattedLabel = searchLabel.trim().replace(/\s+/g, ' ').toLowerCase();
  
    if (!formattedLabel) {
      setSearchLoading(false);  // Stop search loading if input is empty
      setHighlightedLabel([]);  // Reset highlightedLabel to empty
      return;
    }
  
    const foundItem = data.find(item =>
      item.Label &&
      item.Label.toLowerCase().replace(/\s+/g, ' ').includes(formattedLabel)
    );
  
    setSearchLoading(false); // Stop search loading after checking
  
    if (foundItem && foundItem.Label) {
      // If found, 
      setHighlightedLabel([foundItem.Label]);
    } else {
      // If the label is not found, send a request to the Django API
      setApiLoading(true);  // Start API request loading
      try {
        const encodedProjectTitle = encodeURIComponent(projectTitle);
        const encodedUserEmail = encodeURIComponent(userEmail);
        const response = await fetch(process.env.NEXT_PUBLIC_HOST + `/api/search-label/`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-CSRFToken': csrfToken,
          },
          body: JSON.stringify({ label: formattedLabel, projectTitle: encodedProjectTitle, email: encodedUserEmail }),
          credentials: 'include',
        });
  
        if (response.ok) {
          const result = await response.json();
          toast.success(result.message, {
            style: {
              backgroundColor: '#8e44ad', 
              color: 'white', 
              borderRadius: '8px', 
              padding: '10px 20px', 
            },
            
          });
          setData(prevData => [...prevData, result.updated_data]);
        } else {
          throw new Error('API request failed');
        }
      } catch (error) {
        console.error('Error fetching label from ig or db:', error);
        toast.error('The Label-User does not exist in db, and also cannot scrapped from Insagram');
      } finally {
        setApiLoading(false);  // Stop API request loading after completion
      }
    }
  };
  
  
  
  const handleLabelVisibilityChange = () => {
    setShowLabels(!showLabels);
    
  };
  
  const handlePinVisibilityChange = () => {
    setShowPins(!showPins);
   
  };


  const generateRandomId = () => {
    return 'shape-' + Math.random().toString(36).substr(2, 9); // Generate a random string
};


const handleAddCategory = () => {
  if (!categoryName.trim()) {
    toast.error("Please enter a category name");
    return false;
  }

  // Check existing categories
  const existingCategories = data
    .flatMap(node => (node.Category ? node.Category.split(',').map(cat => cat.trim()) : []))
    .filter(Boolean);

  if (existingCategories.includes(categoryName.trim())) {
    toast.error("This category already exists in the nodes");
    return false;
  }

  // Highlighted nodes
  const highlightedNodeIds = new Set(highlightedNodes.map((node) => node.id));
  console.log("Highlighted Node IDs:", highlightedNodeIds);

  // Add category to the nodes
  const updatedData = data.map((node) => {
    if (highlightedNodeIds.has(node.id)) {
      const existingCategories = new Set(
        node.Category ? node.Category.split(",").map((cat) => cat.trim()) : []
      );
      existingCategories.add(categoryName);
      return {
        ...node,
        Category: Array.from(existingCategories).join(","),
      };
    }
    return node;
  });

  // Add the shape's category and title
  let updatedShapes = [...shapes];
  if (lastAddedCategoryShapeID) {
    updatedShapes = updatedShapes.map((shape) => {
      if (shape.id === lastAddedCategoryShapeID) {
        return { ...shape, category: categoryName };
      }
      return shape;
    });
  }

  const newShapeTitle = {
    id: generateRandomId(),
    type: 'title',
    text: categoryName,
    position: cpose , 
    background: drawColor || "#000000", 
    opacity: 0.1,
    stroke: drawColor || "#000000",
    fill: drawColor || "#000000",
    size: titleSize,
  };

  updatedShapes.push(newShapeTitle);
  setShapes(updatedShapes);

  // Update data
  setData(updatedData);

  // Success message
  toast.success(
    `Category "${categoryName}" added to ${highlightedNodes.length} nodes`
  );

  // Reset state
  setCategoryName("");
  setCategoryColor("#000000");
  setShowCategoryInput(false);
  setHighlightedNodes([]);
  setShowInfoPanel(false);
  setShapeType("select");
  setLastAddedCategoryShapeID('');

  return true;
};



useEffect(() => {
  const handleEscKey = (event: KeyboardEvent) => {

    // below codes when we press ESC and also if category input is open it will close it..
    if (event.key === 'Escape' && showCategoryInput) {

      // Close category input
      setShowCategoryInput(false);
      
      // Remove the last added category shape if it exists
      if (lastAddedCategoryShapeID) {
        setShapes(prevShapes => 
          prevShapes.filter(shape => shape.id !== lastAddedCategoryShapeID)
        );
        
        // Reset the last added category shape ID
        setLastAddedCategoryShapeID(null);
      }
    }
  };

  // Add event listener
  window.addEventListener('keydown', handleEscKey);

  // Cleanup event listener
  return () => {
    window.removeEventListener('keydown', handleEscKey);
  };
}, [
  showCategoryInput, 
  setShowCategoryInput, 
  lastAddedCategoryShapeID, 
  setShapes,
  setLastAddedCategoryShapeID,
  setHighlightedLabel,
]);


const toggleCategory = (category: string) => {
  setOpenCategories((prevState) => ({
    ...prevState,
    [category]: !prevState[category], // Toggle category open/close
  }));
};


{/* -------------------------------------------------------------------------------------------------------- */}
{/* For Fetching and Creating Suplots */}
const handleCreateSubPlot = async () => {
  setLoading(true);
  try {
    const encodedProjectTitle = encodeURIComponent(projectTitle);
    const encodedSelection = encodeURIComponent(selection); // "with all" or "only nodes"
    
    // Prepare payload with optional data and shapes based on selection
    const payload: SubPlotPayload = {
      projectTitle: encodedProjectTitle,
      selection: encodedSelection,
      email: userEmail, // user's email address
    };

    // If selection is "with all", add both data and shapes to the payload
    if (selection === "with all") {
      payload.data = data; // Send data if selection is "with all"
      payload.shapes = shapes; // Send shapes if selection is "with all"
    } else if (selection === "only nodes") {
      payload.data = data; // Only send data if selection is "only nodes"
    }

    // Send the request
    const response = await fetch(process.env.NEXT_PUBLIC_HOST + '/api/create-subplot/', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': csrfToken, // CSRF token for Django
      },
      body: JSON.stringify(payload),
      credentials: 'include', // Include cookies for authentication
    });

    if (response.ok) {
      const data = await response.json(); // response from django
      toast.success(`Subplot created: ${data.new_project}`);
    } else {
      throw new Error("Failed to create subplot");
    }
  } catch (error) {
    console.error("Error creating subplot:", error);
    toast.error("Error creating subplot. Please try again.");
  }
  finally {
    setLoading(false); 
  }
};




// Fetch SUBPLOTS Func.
const fetchSubplots = async () => {
  try {
    const response = await fetch(
      `${process.env.NEXT_PUBLIC_HOST}/api/get_subplots/${projectTitle}?email=${userEmail}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
        },
        credentials: 'include',
      }
    );

    if (response.ok) {
      const data = await response.json();
      console.log("Fetched subplots:", data.projects);
      setSubplots(data.projects);
      toast.success("Subplots fetched successfully!");
    } else {
      console.error("Failed to fetch subplots");
      toast.error("Failed to fetch subplots.");
    }
  } catch (error) {
    console.error("Error fetching subplots:", error);
    toast.error("An error occurred while fetching subplots.");
  }
};
// Toggle div visibility
const toggleSubplots = () => setShowSubplots((prev) => !prev);
{/* -------------------------------------------------------------------------------------------------------- */}



console.log(shapes); //DEBUG PURPOSES
console.log(data);



// HANDLING ZOOM VIA BUTTONS
const handleZoom = (direction: 'in' | 'out') => {
  const svg = d3.select(svgRef.current); 
  const zoomStep = direction === 'in' ? 1.5 : 0.6; // zoom in/out rate

  const svgNode = svg.node();
  if (!svgNode) return;

  const zoomBehavior = d3.zoom<SVGSVGElement, unknown>()
    .scaleExtent([0.5, 10])
    .on('zoom', (event) => {
      setZoomTransform(event.transform);
      d3.select(svgNode).select('g.node-layer').attr('transform', event.transform.toString());
      d3.select(drawLayerRef.current).attr('transform', event.transform.toString());
    });

  const { clientWidth, clientHeight } = svgNode;

  // finding the middle point that we are currenly focusing- loooking on the plot 
  const currentTransform = zoomTransform || d3.zoomIdentity;
  const centerX = (clientWidth / 2 - currentTransform.x) / currentTransform.k;
  const centerY = (clientHeight / 2 - currentTransform.y) / currentTransform.k;

  // zoom transform that based on current focus.. 
  const newTransform = d3.zoomIdentity
    .translate(
      currentTransform.x + centerX * (1 - zoomStep) * currentTransform.k,
      currentTransform.y + centerY * (1 - zoomStep) * currentTransform.k
    )
    .scale(currentTransform.k * zoomStep);

  // applying zoom behavioru on plot 
  svg.transition()
    .duration(300) // abimation duration
    .call(zoomBehavior.transform as any, newTransform); //cast 

  setZoomTransform(newTransform);
};


// for tracking dynamically when shapes are updated..
useEffect(() => {
  if (selectedShape && selectedShape.r !== undefined) {
    setTempRadius(selectedShape.r); // Set tempRadius to selectedShape's r value if it's defined
  }
}, [selectedShape]);



const handleDownloadScreenshot = () => {
  const svg = svgRef.current;

  if (!svg) {
    console.error('SVG element not found.');
    return;
  }

  // tested in, 1920X1080, 27' monitor we can set scaleFactor up to 4, very high scale
  // but in order to use it for all computers I set scaleFactor to 1, means, the current computer's screen resolution.
  const scaleFactor = 1; // for, define and increasing resolution scaleFactor
  const serializer = new XMLSerializer();
  const svgData = serializer.serializeToString(svg);
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    console.error('Canvas 2D context not available.');
    return;
  }

  // multiply canva sizes with scaleFactor 
  canvas.width = svg.width.baseVal.value * scaleFactor;
  canvas.height = svg.height.baseVal.value * scaleFactor;

  // set the ctx scale 
  ctx.scale(scaleFactor, scaleFactor);

  const img = new Image();

  img.onload = () => {
    ctx.drawImage(img, 0, 0);
    const pngData = canvas.toDataURL('image/png', 1.0); 
    const link = document.createElement('a');
    link.download = 'HD_Screenshot.png';
    link.href = pngData;
    link.click();
  };

  img.src = 'data:image/svg+xml;base64,' + btoa(svgData);
};



  return (
    <div className="absolute w-full h-full">

      {/* ToolTipp */}
      {tooltip && (
        <div
          style={{
            position: 'absolute',
            left: mousePosition.x + 15,
            top: mousePosition.y + 15,
            padding: '5px',
            backgroundColor: 'rgba(0, 0, 0, 0.8)',
            color: 'white',
            borderRadius: '5px',
            pointerEvents: 'none',
          }}
        >
          {tooltip.label}
        </div>
      )}


  {/* Button for the Categories panel for activate/deactivate */}
  <div className="absolute top-10 left-4 flex flex-row space-x-2 z-50">
    <button
      onClick={() => setShowCategories(prevState => !prevState)} // Toggle state
      className="bg-transparent text-black py-1 px-2 rounded flex items-center justify-center"
      title={showCategories ? "Close Categories" : "Show Categories"}
    >
      {showCategories ? <FaEyeSlash size={20} className="text-black" /> : <FaEye size={20} className="text-black" />}
    </button>
  </div>

{/* Categories panel */}
{showCategories && (
  <div className="absolute top-16 left-2 bg-white rounded-lg shadow-lg p-4 min-w-[400px] max-h-[400px] overflow-y-auto z-40">
    <h3 className="text-lg font-semibold text-gray-800 mb-4">Categories</h3>

    {/* Dynamic Search bar */}
    <input
      type="text"
      value={searchTerm}
      onChange={(e) => setSearchTerm(e.target.value.toLowerCase())} // Update dynamic search 
      placeholder="Search categories..."
      className="w-full px-4 py-2 mb-4 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
    />

    {/* List of Categories */}
    <div>
      {/* Filter categories */}
      {data
        .filter((n) => n.Category) // Filter nodes with categories
        .map((node) => {
          const nodeCategories = node.Category ? node.Category.split(',').map((cat) => cat.trim()) : [];
          return nodeCategories;
        })
        .flat()
        .filter((category, index, self) => self.indexOf(category) === index) // Get unique categories
        .filter((category) => category && category.toLowerCase().includes(searchTerm)) // Filter by search term
        .length === 0 ? (
          // Display message if no categories are found after filtering
          <div className="text-sm text-gray-500">There is no category</div>
        ) : (
          // Map over categories if there are any
          data
            .filter((n) => n.Category) // Filter nodes with categories
            .map((node) => {
              const nodeCategories = node.Category ? node.Category.split(',').map((cat) => cat.trim()) : [];
              return nodeCategories;
            })
            .flat()
            .filter((category, index, self) => self.indexOf(category) === index) // Get unique categories
            .filter((category) => category && category.toLowerCase().includes(searchTerm)) // Filter by search term
            .map((splitCategory) => {
              const relatedNodes = data.filter((node) => {
                const nodeCategories = node.Category ? node.Category.split(',').map((cat) => cat.trim()) : [];
                return nodeCategories.includes(splitCategory) && node.Label;
              });

              return (
                <div key={splitCategory} className="mb-4 p-4 bg-gray-50 rounded-lg">
                  <div className="flex justify-between items-center mb-2">
                    <h4 className="font-medium text-gray-900">{splitCategory}</h4>
                    <button
                      onClick={() => toggleCategory(splitCategory)} // Toggle category open/close
                      className="text-sm text-gray-500 bg-blue-200 px-3 py-1 rounded hover:bg-blue-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      title="Toggle category visibility"
                    >
                      {openCategories[splitCategory] ? 'Hide' : 'Show'} ({relatedNodes.length} nodes)
                    </button>

                    <button
                      onClick={() => {
                        // Extract only the Label values from relatedNodes
                        const labelData = relatedNodes
                          .map((node) => ({ Label: node.Label })) // Extract Label as key-value pair for Excel
                          .filter((node) => node.Label !== undefined); // Remove undefined labels

                        // Create a worksheet with the labels
                        const worksheet = XLSX.utils.json_to_sheet(labelData);
                        const workbook = XLSX.utils.book_new();
                        XLSX.utils.book_append_sheet(workbook, worksheet, splitCategory);

                        // Create the Excel file and trigger the download
                        XLSX.writeFile(workbook, `${splitCategory}_labels.xlsx`);
                      }}
                      className="text-sm text-gray-500 bg-green-200 px-3 py-1 rounded hover:bg-green-300 focus:outline-none focus:ring-2 focus:ring-green-500"
                      title="Export category labels to Excel"
                    >
                      <FaFileExport size={16} className="inline-block mr-1" />
                      Export
                  </button>
                  </div>
                  
                  {/* checkbox for selection */}
                  <div className="flex items-center space-x-2 mb-2">
                    <input
                      type="checkbox"
                      id={`checkbox-${splitCategory}`}
                      // Inside the onChange handler
                      onChange={(e) => {
                        // Ensuring,the  relatedNodes labels are strings, filtering out undefined values
                        const selectedLabels = relatedNodes
                          .map((node) => node.Label)
                          .filter((label): label is string => label !== undefined); // Filter undefined values

                        if (e.target.checked) {
                          console.log(`Nodes in category "${splitCategory}":`, selectedLabels); // Log selected labels
                          setHighlightedLabel((prev) => {
                            // Default prev to an empty array if it's null
                            const prevLabels = prev || [];
                            
                            // Convert Set to array before spreading
                            const uniqueLabels = Array.from(new Set([...prevLabels, ...selectedLabels]));
                            
                            return uniqueLabels;  // Return the unique labels as an array
                          });
                        } else {
                          console.log(`Deselecting nodes in category "${splitCategory}":`, selectedLabels);
                          setHighlightedLabel((prev) => {
                            // Default prev to an empty array if it's null
                            const prevLabels = prev || [];
                            
                            // Remove the selected labels from the list
                            const updatedLabels = prevLabels.filter((label) => !selectedLabels.includes(label));

                            // If there are no more highlighted labels, set it to null
                            return updatedLabels.length > 0 ? updatedLabels : null;
                          });
                        }
                      }}
                    />
                    <label
                      htmlFor={`checkbox-${splitCategory}`}
                      className="text-sm text-gray-700 font-semibold hover:text-yellow-600 transition-colors duration-200 cursor-pointer"
                    >
                      Highlight All category '{splitCategory}'
                    </label>

                  </div>



                  {/* Category content */}
                  {openCategories[splitCategory] && (
                  <div className="space-y-2 mt-2">
                    {relatedNodes.map((node) => (
                      <div
                        key={`${splitCategory}-${node.id}`}
                        className="flex justify-between items-center p-2 bg-white rounded hover:bg-gray-100"
                      >
                        <span className="text-sm text-gray-600">{node.Label}</span>
                        <div className="flex items-center space-x-2">

                          {/* Highlight button */}
                          <button
                            onClick={() => {
                              if (node.Label && !highlightedLabel?.includes(node.Label)) {
                                setHighlightedLabel((prev) => {
                                  const prevLabels = prev || [];
                                  // Only include valid strings in the array
                                  const newLabels = [...prevLabels, node.Label].filter((label): label is string => label !== undefined);
                                  return Array.from(new Set(newLabels)); // Make sure to return a deduplicated array
                                });
                              }
                            }}
                            className="text-blue-500 hover:text-blue-700"
                            title="Highlight node"
                          >
                            <FaSearchLocation size={16} />
                          </button>
                          
                          {/* Remove Highlight Butonu */}
                          <button
                            onClick={() => {
                              if (node.Label && highlightedLabel?.includes(node.Label)) {
                                setHighlightedLabel((prev) => {
                                  const prevLabels = prev || [];
                                  // Filter out the label and return a new array
                                  return prevLabels.filter((label) => label !== node.Label) || null;
                                });
                              }
                            }}
                            className="text-red-500 hover:text-red-700"
                            title="Remove highlight from node"
                          >
                            <FaRegTimesCircle size={16} />
                          </button>
                          
                          <a
                            href={`https://instagram.com/${node.Label}/`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-blue-500 hover:text-blue-700"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <FaInstagram size={16} />
                          </a>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                </div>
              );
            })
        )}
    </div>
  </div>
)}





{/* Control panel*/}
<div className="absolute top-2 right-2 flex flex-row space-x-2 z-10">
  {!drawMode && (
      <button
        onClick={() => setDrawMode(true)}
        className="bg-blue-500 text-white py-1 px-2 rounded flex items-center justify-center"
        title="Draw Tools"
      >
        <FaPen size={20} /> {/* Draw Tools icon when closed */}
      </button>
  )}

{drawMode && (
  <div className="flex flex-col space-y-1">
    {/* TOOls */}
    <div className="flex flex-wrap gap-1">
      {/* Close Button for drawmode */}
      <button
        onClick={() => setDrawMode(false)}
        className="bg-blue-500 text-white p-1 rounded flex items-center justify-center"
        title="Close Draw Tools"
      >
        <FaTimes size={16} />
      </button>

      <button
        onClick={() => setShapeType('box')}
        className={`p-1 rounded text-white ${shapeType === 'box' ? 'bg-green-500' : 'bg-yellow-900'} flex items-center`}
      >
        <FaSquare size={16} />
        <span className="text-xs ml-1">CategoryBS</span>
      </button>

      <button
        onClick={() => setShapeType('lasso')}
        className={`p-1 rounded text-white ${shapeType === 'lasso' ? 'bg-green-500' : 'bg-yellow-900'} flex items-center`}
      >
        <FaDrawPolygon size={16} />
        <span className="text-xs ml-1">CategoryLS</span>
      </button>

      {/* All other buttons */}
      <button
        onClick={() => setShapeType('filledCircleSelect')}
        className={`p-1 rounded text-white ${shapeType === 'filledCircleSelect' ? 'bg-green-500' : 'bg-yellow-900'} flex items-center`}
      >
        <FaCircle size={16} />
        <span className="text-xs ml-1">CategoryFCS</span>
      </button>

      <button
        onClick={() => setShapeType('line')}
        className={`p-1 rounded text-white ${shapeType === 'line' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaMinus size={16} />
        <span className="text-xs ml-1">Line</span>
      </button>

      <button
        onClick={() => setShapeType('rectangle')}
        className={`p-1 rounded text-white ${shapeType === 'rectangle' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaRegSquare size={16} />
        <span className="text-xs ml-1">Rect</span>
      </button>

      <button
        onClick={() => setShapeType('filledRectangle')}
        className={`p-1 rounded text-white ${shapeType === 'filledRectangle' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaSquare size={16} />
        <span className="text-xs ml-1">FRect</span>
      </button>

      <button
        onClick={() => setShapeType('filledCircle')}
        className={`p-1 rounded text-white ${shapeType === 'filledCircle' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaCircle size={16} />
        <span className="text-xs ml-1">FCircle</span>
      </button>

      <button
        onClick={() => setShapeType('circle')}
        className={`p-1 rounded text-white ${shapeType === 'circle' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaRegCircle size={16} />
        <span className="text-xs ml-1">Circle</span>
      </button>

      <button
        onClick={() => setShapeType('title')}
        className={`p-1 rounded text-white ${shapeType === 'title' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaPenSquare size={16} />
        <span className="text-xs ml-1">Title</span>
      </button>

      <button
        onClick={() => setShapeType('select')}
        className={`p-1 rounded text-white ${shapeType === 'select' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaMousePointer size={16} />
        <span className="text-xs ml-1">Select</span>
      </button>

      <button
        onClick={() => setShapeType('drag-shape')}
        className={`p-1 rounded text-white ${shapeType === 'drag-shape' ? 'bg-green-500' : 'bg-gray-500'} flex items-center`}
      >
        <FaArrowsAlt size={16} />
        <span className="text-xs ml-1">Drag</span>
      </button>

      {/* Delete Button */}
      {selectedShape ? (
        <button
          onClick={deleteSelectedShape}
          className="bg-red-500 text-white p-1 rounded flex items-center"
        >
          <FaTrashAlt size={16} />
          <span className="text-xs ml-1">Delete</span>
        </button>
      ) : (
        <button
          className="bg-red-500 text-white p-1 rounded cursor-not-allowed opacity-50 flex items-center"
          disabled
        >
          <FaTrashAlt size={16} />
          <span className="text-xs ml-1">Delete</span>
        </button>
      )}

      {/* Color slecttion */}
      <input
        type="color"
        value={drawColor}
        onChange={(e) => setDrawColor(e.target.value)}
        className="border rounded w-12 h-8"
        title="Select Color"
      />
    </div>

    {/* Active tool's info */}
    <div className="text-center text-xs text-gray-700">
      <div>{`Current Active Tool: ${shapeType}`}</div>
      {shapeType && (
        <div className="mt-1 text-gray-500">
          {toolDescriptions[shapeType] || "No description available."}
        </div>
      )}
    </div>
  </div>
)}

</div>


      

  
{/* 'Settings' button */}
<button
  onClick={handleSettingsToggle}
  className="absolute bottom-4 left-4 bg-gray-700 text-white py-2 px-4 rounded-md z-20 flex items-center justify-center hover:bg-gray-600 hover:scale-105 transition-all"
>
  <FaCog size={20} />
</button>

{/* Settings PANEL */}
{settingsOpen && (
  <div className="absolute bottom-16 left-4 p-4 rounded shadow-md w-full max-w-4xl bg-gradient-to-br from-gray-800 to-gray-900 text-white z-20">
    
    {/* 1. BLOCK - Search Label Input */}
    <div className="mb-6 w-full">
      <h3 className="text-white font-semibold mb-2 text-center">Search Label</h3>
      <div className="flex">
        <input
          type="text"
          value={searchLabel}
          onChange={(e) => setSearchLabel(e.target.value)}
          className="w-full p-2 border border-gray-600 rounded-lg bg-gray-700 text-white placeholder-gray-400"
          placeholder="Etiket girin..."
        />
        <button
          onClick={handleSearch}
          className="ml-2 p-2 bg-blue-600 text-white rounded-lg transition hover:bg-blue-500"
        >
          Search
        </button>
      </div>
    </div>

    {/* Middle BLOCK */}
    <div className="flex justify-between">
      
      {/* Middle-Left - LabelSize, Color, Hide/Show Options */}
      <div className="w-1/2 pr-6">
        <div className="grid grid-cols-2 gap-4 mb-4">
          
          {/* Left: LabelSize and NodeSize Setting */}
          <div className="space-y-4 " >
            {/* NodeSize Setting */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300"> Node Size:</label>
              <input
                type="range"
                min="1"
                max="20"
                value={nodeSize}
                onChange={(e) => setNodeSize(Number(e.target.value))}
                className="w-full"
              />
            </div>

            {/* Label Size Setting */}
            <div>
              <label className="block font-semibold mb-1 text-gray-300"> Label Size:</label>
              <input
                type="range"
                min="2"
                max="40"
                value={labelSize}
                onChange={(e) => setLabelSize(Number(e.target.value))}
                className="w-full"
              />
            </div>
          </div>

          {/* Right: Background and Label Color Settings */}
          <div className="space-y-4">
            {/* Background Color Changing- */}
            <div>
              <label className="block font-semibold mb-1">Background Color:</label>
              <input
                type="color"
                value={bgColor}
                onChange={(e) => setBgColor(e.target.value)}
                className="w-full h-5 rounded border text-gray-300 border-gray-300 cursor-pointer bg-gray-700"
              />
            </div>

            {/* Set Label Color */}
            <div>
              <label className="block font-semibold mb-1">Label Color:</label>
              <input
                type="color"
                value={labelColor}
                onChange={(e) => setLabelColor(e.target.value)}
                className="w-full h-5 rounded border text-gray-300 border-gray-300 cursor-pointer bg-gray-700"
              />
            </div>
          </div>
        </div>

        {/* Show/Hide Labels */}
        <div className="mb-4 flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showLabels}
            onChange={handleLabelVisibilityChange}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-300">Show/Hide Labels </label>
        </div>

        {/* Show/Hide PIN symbols with selection */}
        <div className="mb-4 flex items-center space-x-2">
          <input
            type="checkbox"
            checked={showPins}
            onChange={handlePinVisibilityChange}
            className="mr-2"
          />
          <label className="text-sm font-medium text-gray-300">Show/Hide PINs</label>
        </div>
        <div className="mb-4">
          <label className="block font-semibold mb-1">Select Pin Image:</label>
          <select
            value={selectedPinImage}
            onChange={(e) => setSelectedPinImage(e.target.value)}
            className="w-full p-2 bg-gray-700 border border-gray-600 rounded-lg"
          >
            <option value="pin1">Pin 1</option>
            <option value="pin2">Pin 2</option>
            <option value="pin3">Pin 3</option>
          </select>
        </div>


        {/* Delete Shapes Buttonn */}
        {selectedShape ? (
          <div className="flex items-center space-x-2">
            <button
              onClick={deleteSelectedShape}
              className="bg-red-500 text-white py-2 px-4 rounded"
            >
              Sil
            </button>
            <span className="text-gray-300">Selected Shape : {selectedShape.type}</span>
          </div>
        ) : (
          <button
            className="bg-red-500 text-white py-2 px-4 rounded cursor-not-allowed opacity-50"
            disabled
          >
            Delete
          </button>
        )}
      </div>

      {/* Middle-Right - ModularityClass */}
      <div className="w-1/2 pl-6">
      <h3 className="font-bold mb-4 text-gray-300">Select Modularity Class</h3>

      {/* Toggle Select All / Unselect All Button */}
      <div className="flex items-center mb-4">
        <button
          onClick={toggleSelectAll}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-600"
        >
          {selectedModularityClasses.size === uniqueModularityClasses.length
            ? "Unselect All"
            : "Select All"}
        </button>
      </div>

      {/* Modularity Class List */}
      <div className="max-h-48 overflow-y-auto mb-4 space-y-2">
        {uniqueModularityClasses.map((modularityClass) => (
          <div key={modularityClass} className="flex items-center">
            <input
              type="checkbox"
              checked={selectedModularityClasses.has(modularityClass)}
              onChange={() => handleModularityClassChange(modularityClass)}
              className="mr-2"
            />
            <label className="text-white">{modularityClass}</label>
          </div>
        ))}
      </div>
    </div>


    </div>



    {/* 4. Block - Save Shapes Button */}
    <div className="mt-6">
      <button
        onClick={saveShapes}
        disabled={userRole !== 'editor'}
        className={`w-full py-2 rounded-lg shadow-md transition focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50
          ${userRole === 'editor' ? 'bg-blue-600 text-white hover:bg-blue-500' : 'bg-gray-500 text-gray-300 cursor-not-allowed'}`}
      >
        Save Shapes
      </button>
    </div>
  </div>
)}




    
  {showCategoryInput && (
  <div className="fixed inset-0 z-50 bg-black bg-opacity-70">
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 
      bg-white rounded-lg shadow-xl p-4 z-60 w-96">
      <div className="flex justify-between items-center mb-3">
        <h3 className="text-sm font-medium text-gray-700">
          {highlightedNodes.length > 0 
            ? `Adding category to ${highlightedNodes.length} selected nodes.
               P.S. Nodes that doesn't have labels will not appear on Categories!`
            : "No nodes selected. Please select nodes before adding a category."}
        </h3>
      </div>
      
      <div className="flex space-x-2">
        <input
          type="text"
          value={categoryName}
          onChange={(e) => setCategoryName(e.target.value)}
          placeholder="Enter category name"
          className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
        />
        <button
          onClick={() => {
            const result = handleAddCategory();
            if (result) {
              // Close category input if category is successfully added
              setShowCategoryInput(false);
            }
          }}
          className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
          disabled={highlightedNodes.length === 0}
        >
          Add
        </button>
      </div>
    </div>
  </div>
)}

{/* Info Panel */}
{showInfoPanel && showCategoryInput && (
  <div className="absolute bottom-2 right-2 bg-white border rounded-lg shadow-lg p-4 max-h-60 overflow-auto z-50">
    <div>
      <h3 className="text-xl font-bold text-gray-800">Highlighted Nodes</h3>
    </div>
    <div>
      {highlightedNodes.length > 0 ? (
        highlightedNodes
          .filter(node => node.Label) 
          .map((node, index) => (
            <div key={index} className="mb-2 p-2 border border-gray-200 rounded-md shadow-sm">
              <div className="text-lg font-semibold text-gray-900">Node Label: {node.Label}</div>
              <div className="text-sm text-gray-600">Coordinates: ({node.X}, {node.Y})</div>
              <div className="text-sm text-gray-700">
                Instagram: 
                <a 
                  href={`https://instagram.com/${node.Label}/`} 
                  target="_blank" 
                  rel="noopener noreferrer" 
                  className="text-blue-600 hover:underline transition duration-200"
                >
                  {node.Label}
                </a>
              </div>
            </div>
          ))
      ) : (
        <div className="text-gray-600">No nodes highlighted</div>
      )}
    </div>
  </div>
)}




  
{(isAddingTitle && showInput===true || (isUpdatingTitle && selectedShape && selectedShape.type === 'title')) && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    <input
      type="text"
      value={titleText}
      onChange={(e) => setTitleText(e.target.value)}
      placeholder="Başlık Girin"
      className="border border-gray-300 rounded p-1 w-32"
    />
    <input
      type="color"
      value={titleColor}
      onChange={(e) => setTitleColor(e.target.value)}
      className="ml-2"
      title="Text Color"
    />
    <input
      type="number"
      value={titleSize}
      onChange={(e) => setTitleSize(Number(e.target.value))}
      placeholder="Font Size"
      className="ml-2 border border-gray-300 rounded p-1 w-16"
      title="Font Size"
    />
    <input
      type="color"
      value={titleBackground}
      onChange={(e) => setTitleBackground(e.target.value)}
      className="ml-2"
      title="Background Color"
    />
    <button
      onClick={isUpdatingTitle ? updateTitle : addTitle}
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2"
    >
      {isUpdatingTitle ? 'Güncelle' : 'Ekle'}
    </button>
  </div>
)}




{selectedShape && selectedShape.type === 'filledRectangle' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    {/* Fill Color Picker */}
    <input
      type="color"
      value={tempFillColor}
      onChange={(e) => setTempFillColor(e.target.value)} 
      className="ml-2"
      title="Fill Color"
    />
    
    {/* Opacity Slider */}
    <div className="mt-2">
      <label htmlFor="opacity" className="mr-2">Opaklık:</label>
      <input
        type="range"
        id="opacity"
        min="0"
        max="1"
        step="0.1"
        value={tempOpacity} 
        onChange={(e) => setTempOpacity(Number(e.target.value))} 
        className="ml-2"
      />
      <span className="ml-2">{(tempOpacity * 100).toFixed(0)}%</span>
    </div>

    {/* Conditionally render Width and Height sliders */}
    {!selectedShape?.category && (
      <>
        {/* Width Slider */}
        <div className="mt-2">
          <label htmlFor="width" className="mr-2">Genişlik:</label>
          <input
            type="range"
            id="width"
            min="10"
            max="400"
            step="1"
            value={tempWidth} 
            onChange={(e) => setTempWidth(Number(e.target.value))} 
            className="ml-2"
          />
          <span className="ml-2">{tempWidth}px</span>
        </div>
        
        {/* Height Slider */}
        <div className="mt-2">
          <label htmlFor="height" className="mr-2">Yükseklik:</label>
          <input
            type="range"
            id="height"
            min="10"
            max="400"
            step="1"
            value={tempHeight} // Geçici yükseklik değeri
            onChange={(e) => setTempHeight(Number(e.target.value))} 
            className="ml-2"
          />
          <span className="ml-2">{tempHeight}px</span>
        </div>
      </>
    )}

    {/* Update Button */}
    <button
      onClick={() => {
        if (selectedShape?.category) {
          // Category varsa sadece opacity ve fillColor güncellenir, boyut değişmez
          updateFilledRectangle(tempOpacity, undefined, undefined, tempFillColor); // Width ve height değiştirilmiyor
        } else {
          // Category yoksa opacity, fillColor, width ve height güncellenir
          updateFilledRectangle(tempOpacity, tempWidth, tempHeight, tempFillColor);
        }
      }}
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2 mt-2"
    >
      Update
    </button>
  </div>
)}



{selectedShape && selectedShape.type === 'filledCircle' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    {/* Fill Color Picker */}
    <input
      type="color"
      value={tempFillColor}
      onChange={(e) => setTempFillColor(e.target.value)} 
      className="ml-2"
      title="Fill Color"
    />

    {/* Opacity Slider */}
    <div className="mt-2">
      <label htmlFor="opacity" className="mr-2">Opaklık:</label>
      <input
        type="range"
        id="opacity"
        min="0"
        max="1"
        step="0.1"
        value={tempOpacity} 
        onChange={(e) => setTempOpacity(Number(e.target.value))} 
        className="ml-2"
      />
      <span className="ml-2">{(tempOpacity * 100).toFixed(0)}%</span>
    </div>

    {/* Conditionally render Radius slider only if no category */}
    {!selectedShape?.category && (
      <div className="mt-2">
        <label htmlFor="radius" className="mr-2">Yarıçap:</label>
        <input
          type="range"
          id="radius"
          min="10"
          max="200"
          step="1"
          value={tempRadius} 
          onChange={(e) => setTempRadius(Number(e.target.value))} 
          className="ml-2"
        />
        <span className="ml-2">{tempRadius}px</span>
      </div>
    )}

    <button
      onClick={() => {
        if (selectedShape?.category) {
          // Category varsa sadece opacity ve fillColor güncellenir-if category exists, only opacity, fillColor will be updated
          updateFilledCircle(tempOpacity, undefined, tempFillColor); 
        } else {
          // Category yoksa opacity, fillColor ve radius güncelle- if doesn't existsç...
          updateFilledCircle(tempOpacity, tempRadius, tempFillColor);
        }
      }}
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2 mt-2"
    >
      Update
    </button>
  </div>
)}





{selectedShape && selectedShape.type === 'line' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    <input
      type="color"
      value={strokeColor}
      onChange={(e) => setStrokeColor(e.target.value)}
      className="ml-2"
      title="Line Color"
    />
    <button
      onClick={updateLine}
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2 mt-2"
    >
      Update
    </button>
  </div>
)}

{selectedShape && selectedShape.type === 'rectangle' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    {/* Color Picker for Stroke Color */}
    <input
      type="color"
      value={strokeColor}
      onChange={(e) => setStrokeColor(e.target.value)} 
      className="ml-2"
      title="Stroke Color"
    />

    {/* Width Slider */}
    <div className="mt-2">
      <label htmlFor="width" className="mr-2">Genişlik:</label>
      <input
        type="range"
        id="width"
        min="10" 
        max="500" 
        step="1"
        value={tempWidth} 
        onChange={(e) => setTempWidth(Number(e.target.value))} 
        className="ml-2"
      />
      <span className="ml-2">{tempWidth}px</span>
    </div>

    {/* Height Slider */}
    <div className="mt-2">
      <label htmlFor="height" className="mr-2">Yükseklik:</label>
      <input
        type="range"
        id="height"
        min="10" 
        max="500" 
        step="1"
        value={tempHeight} 
        onChange={(e) => setTempHeight(Number(e.target.value))} 
        className="ml-2"
      />
      <span className="ml-2">{tempHeight}px</span>
    </div>

    <button
      onClick={() => updateRectangle(strokeColor, tempWidth, tempHeight)} 
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2 mt-2"
    >
      Update
    </button>
  </div>
)}




{selectedShape && selectedShape.type === 'path' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
    {/* Fill Color Picker */}
    <input
      type="color"
      value={fillColor}
      onChange={(e) => setFillColor(e.target.value)}
      className="ml-2"
      title="Fill Color"
    />
    
    {/* Opacity Slider */}
    <div className="mt-2">
      <label htmlFor="opacity" className="mr-2">Opaklık:</label>
      <input
        type="range"
        id="opacity"
        min="0"
        max="1"
        step="0.1"
        value={opacityValue} 
        onChange={(e) => {
          const newOpacity = Number(e.target.value);
          setOpacityValue(newOpacity); 
        }}
        className="ml-2"
      />
      <span className="ml-2">
        {(opacityValue * 100).toFixed(0)}%  
      </span>
    </div>

    <button
      onClick={() => updatePath(opacityValue, fillColor)} // Update butonuna tıklanırsa opacityValue ve fillColor güncellenir
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2"
    >
      Update
    </button>
  </div>
)}



{selectedShape && selectedShape.type === 'circle' && (
  <div className="fixed bottom-0 left-1/2 transform -translate-x-1/2 p-2 bg-white border border-gray-300 rounded shadow-lg mb-4 mr-4 z-20">
  {/* Color Picker for Stroke Color */}
    <input
      type="color"
      value={strokeColor}
      onChange={(e) => setStrokeColor(e.target.value)} 
      className="ml-2"
      title="Stroke Color"
    />

    {/* Radius Slider */}
    <div className="mt-2">
      <label htmlFor="radius" className="mr-2">Yarıçap:</label>
      <input
        type="range"
        id="radius"
        min="5" // Minimum radius
        max="200" // Maximum radius
        step="1"
        value={tempRadius} 
        onChange={(e) => setTempRadius(Number(e.target.value))} 
        className="ml-2"
      />
      <span className="ml-2">{tempRadius}px</span>
    </div>

    <button
      onClick={() => updateCircle(strokeColor, tempRadius)} 
      className="bg-blue-500 text-white py-1 px-2 rounded ml-2 mt-2"
    >
      Update
    </button>
  </div>
)}





      {/* Message for ESC key */}
      {showCategoryInput && (
        <div className="fixed inset-0 z-40 flex justify-center items-center text-yellow-400 text-xl font-medium">
          <div className="bg-black bg-opacity-80 p-9 rounded-lg">
            Press ESC to close the panel
          </div>
        </div>
      )}


      {/* SVG-PLOT */}
      <svg ref={svgRef} className="w-full h-full" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="xMidYMid meet" width={width} height={height} onClick={handleSvgClick}>
        <g className="node-layer"></g>
        <g ref={drawLayerRef} className="draw-layer"></g>
      </svg>


      {/* Zoom In/Out Buttons */}
      <div className="absolute bottom-12 left-1 p-4 flex flex-col space-y-2">
        <button
          onClick={() => handleZoom('in')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          title="Zoom In"
        >
          <FaSearchPlus size={16} />
        </button>
        <button
          onClick={() => handleZoom('out')}
          className="px-4 py-2 bg-blue-500 text-white rounded hover:bg-blue-700"
          title="Zoom Out"
        >
          <FaSearchMinus size={16} />
        </button>
        <button
          onClick={handleDownloadScreenshot}
          className="px-4 py-2 bg-green-500 text-white rounded hover:bg-green-700"
          title="Download Screenshot"
        >
          <FaCamera size={16} />
        </button>
      </div>




      
{/* Buttons Container */}
<div className="absolute bottom-5 right-8 flex space-x-3">
  {/* (+) Button-for creating subplots */}
  <button
    className="p-1.5 bg-green-500 text-white rounded-full transition-all duration-500 ease-in-out shadow-lg"
    onClick={() => setIsModalOpen(!isModalOpen)}
  >
    <FaPlus className="text-base" />
  </button>

  {/* Show Subplots Button */}
  <button
    className="p-1.5 bg-blue-500 text-white rounded-full transition-all duration-500 ease-in-out shadow-lg"
    onClick={toggleSubplots}
  >
    {showSubplots ? (
      <FaEyeSlash className="text-base" />
    ) : (
      <FaEye className="text-base" />
    )}
  </button>
</div>


{/* Modal for creating a subplot */}
{isModalOpen && (
  <div
    className="absolute bottom-20 right-8 bg-gray-800 p-3 rounded shadow-lg text-white w-56 animate__animated animate__fadeInDown animate__delay-0.5s transform scale-0 transition-all duration-300 ease-in-out"
    style={{ transformOrigin: "bottom right" }} 
  >
    <h2 className="font-bold text-sm mb-2">Create Sub Plot</h2>
    <select
      className="w-full p-1.5 mb-2 bg-gray-700 rounded transition-all duration-300 focus:ring-2 focus:ring-blue-400"
      value={selection}
      onChange={(e) => setSelection(e.target.value)}
    >
      <option value="with all">With All</option>
      <option value="only nodes">Only Nodes</option>
    </select>
    <button
      className="w-full p-1.5 bg-blue-500 rounded hover:bg-blue-600 transform hover:scale-105 transition-all duration-300 ease-in-out"
      onClick={handleCreateSubPlot}
      disabled={loading}
    >
      {loading ? "Creating..." : "Create Sub Plot"}
    </button>
  </div>
)}


{/* Show subplots section */}
{showSubplots && (
  <div
    className="absolute bottom-20 right-8 bg-gray-800 p-3 rounded shadow-lg text-white w-64 animate__animated animate__fadeInDown animate__delay-0.5s transform scale-0 transition-all duration-300 ease-in-out"
    style={{ transformOrigin: "bottom right" }} 
  >
    <h3 className="font-semibold text-md mb-2">Subplots</h3>

    {/* Fetch Subplots Button */}
    <button
      className="w-full mb-2 p-1.5 bg-green-500 rounded hover:bg-green-600 transform hover:scale-105 transition-all duration-300 ease-in-out"
      onClick={fetchSubplots}
    >
      Get
    </button>

    <ul className="list-none space-y-1">
      <li className="text-green-400 font-medium text-sm">
        Current Project: <span className="text-white">{projectTitle}</span>
      </li>

      {/* Filtered Subplots List */}
      {subplots.filter((subplot) => subplot !== projectTitle).length > 0 ? (
        subplots
          .filter((subplot) => subplot !== projectTitle)
          .map((subplot, index) => (
            <li
              key={index}
              className="flex justify-between items-center text-gray-300 bg-gray-700 px-2 py-1 rounded hover:bg-gray-600 transform hover:scale-105 transition-all duration-300 ease-in-out text-sm"
            >
              {subplot}

              {/* Go Button to navigate to the subplot page */}
              <Link href={`/projects/map/${subplot}`}>
                <button
                  className="ml-2 p-1.5 bg-blue-500 text-white rounded hover:bg-blue-600 transform hover:scale-105 transition-all duration-300 ease-in-out"
                >
                  Go
                </button>
              </Link>
            </li>
          ))
      ) : (
        <li className="text-red-400 text-sm">Click the "Get" button to get subplots</li>
      )}
    </ul>
  </div>
)}

      <div className="absolute top-0 left-0 p-4 text-white" >
        <h1 className="text-lg font-bold" style={{ color: labelColor }}>
          Project: {projectTitle} Role : {userRole}
        </h1>
      </div>


      {userRole !== 'editor' && (
        <>
          <div className="absolute bottom-24 right-1/2 transform translate-x-1/2 bg-black text-white text-sm rounded p-2 flex items-center shadow-lg">
            <BsLock size={18} /> 
          </div>
          <div className="absolute bottom-16 right-1/2 transform translate-x-1/2 text-black text-base font-semibold text-center">
            As a Viewer, you don't have permission to edit or save the project. Please contact with project creator for further assistance.  
          </div>
        </>
      )}


      {loading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50">
          {/* Spinner */}
          <div className="w-16 h-16 border-4 border-t-4 border-t-blue-500 border-gray-300 rounded-full animate-spin mb-4"></div>
          {/* Message */}
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold mb-2">
              Subplot is being created...
            </h2>
            <p className="text-gray-300 text-sm">
              Please wait patiently. It may take a while.
            </p>
          </div>
        </div>
      )}

      {searchLoading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="w-16 h-16 border-4 border-t-4 border-t-blue-500 border-gray-300 rounded-full animate-spin mb-4"></div>
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold mb-2">Searching...</h2>
            <p className="text-gray-300 text-sm">Please wait while we search for the label.</p>
          </div>
        </div>
      )}

      {apiLoading && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="w-16 h-16 border-4 border-t-4 border-t-yellow-500 border-gray-300 rounded-full animate-spin mb-4"></div>
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold mb-2">Processing Request...</h2>
            <p className="text-gray-300 text-sm">Please wait while we fetch the label from the database or Scrapping from IG.</p>
          </div>
        </div>
      )}

      {isSaving && (
        <div className="fixed inset-0 flex flex-col items-center justify-center bg-black bg-opacity-70 z-50">
          <div className="w-16 h-16 border-4 border-t-4 border-t-red-500 border-gray-300 rounded-full animate-spin mb-4"></div>
          <div className="text-center">
            <h2 className="text-white text-xl font-semibold mb-2">Saving...</h2>
            <p className="text-gray-300 text-sm">Please wait while we save. This may take a moment to complete.</p>
          </div>
        </div>
      )}

      </div>

  );
};

export default ProjectMapPage;
