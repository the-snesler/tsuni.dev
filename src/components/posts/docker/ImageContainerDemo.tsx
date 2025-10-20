import { useReducer } from 'preact/hooks';

interface Image {
  id: string;
  name: string;
  tag: string;
  isBuilding?: boolean;
}

interface Container {
  id: string;
  name: string;
  imageId: string;
  status: 'running' | 'stopped';
}

interface State {
  images: Image[];
  containers: Container[];
  dockerfileCode: string;
}

type Action =
  | { type: 'BUILD_START' }
  | { type: 'BUILD_COMPLETE' }
  | { type: 'DELETE_IMAGE'; imageId: string }
  | { type: 'START_CONTAINER'; imageId: string }
  | { type: 'STOP_CONTAINER'; containerId: string }
  | { type: 'DELETE_CONTAINER'; containerId: string }
  | { type: 'UPDATE_CODE'; code: string };

const initialState: State = {
  images: [],
  containers: [],
  dockerfileCode: `FROM node:18-alpine
WORKDIR /app
COPY package.json .
RUN npm install
COPY . .
CMD ["node", "index.js"]`
};

function generateId() {
  return Math.random().toString(36).substring(2, 10);
}

function reducer(state: State, action: Action): State {
  switch (action.type) {
    case 'BUILD_START': {
      const tempId = `building-${Date.now()}`;
      return {
        ...state,
        images: [
          ...state.images,
          {
            id: tempId,
            name: 'my-app',
            tag: 'latest',
            isBuilding: true
          }
        ]
      };
    }

    case 'BUILD_COMPLETE': {
      const buildingImage = state.images.find(img => img.isBuilding);
      if (!buildingImage) return state;

      const newId = generateId();
      return {
        ...state,
        images: state.images.map(img => (img.isBuilding ? { ...img, id: newId, isBuilding: false } : img))
      };
    }

    case 'DELETE_IMAGE': {
      // Can't delete if containers are using it
      const hasRunningContainers = state.containers.some(c => c.imageId === action.imageId);
      if (hasRunningContainers) return state;

      return {
        ...state,
        images: state.images.filter(img => img.id !== action.imageId)
      };
    }

    case 'START_CONTAINER': {
      const image = state.images.find(img => img.id === action.imageId);
      if (!image) return state;

      const randomNames = ['delectable-dodo', 'unfortunate-pebble', 'yummy-munchkin', 'zealous-zebra', 'happy-hippo'];
      const newContainer: Container = {
        id: generateId(),
        name: randomNames[Math.floor(Math.random() * randomNames.length)],
        imageId: action.imageId,
        status: 'running'
      };

      return {
        ...state,
        containers: [...state.containers, newContainer]
      };
    }

    case 'STOP_CONTAINER': {
      return {
        ...state,
        containers: state.containers.map(c => (c.id === action.containerId ? { ...c, status: 'stopped' } : c))
      };
    }

    case 'DELETE_CONTAINER': {
      return {
        ...state,
        containers: state.containers.filter(c => c.id !== action.containerId)
      };
    }

    case 'UPDATE_CODE': {
      return {
        ...state,
        dockerfileCode: action.code
      };
    }

    default:
      return state;
  }
}

export default function ImageContainerDemo() {
  const [state, dispatch] = useReducer(reducer, initialState);

  const handleBuild = () => {
    dispatch({ type: 'BUILD_START' });
    // Simulate build time with striped animation
    setTimeout(() => {
      dispatch({ type: 'BUILD_COMPLETE' });
    }, 2000);
  };

  const handleDeleteImage = (imageId: string) => {
    dispatch({ type: 'DELETE_IMAGE', imageId });
  };

  const handleRunContainer = (imageId: string) => {
    dispatch({ type: 'START_CONTAINER', imageId });
  };

  const handleStopContainer = (containerId: string) => {
    dispatch({ type: 'STOP_CONTAINER', containerId });
  };

  const handleDeleteContainer = (containerId: string) => {
    dispatch({ type: 'DELETE_CONTAINER', containerId });
  };

  return (
    <div className="aside-tall">
      <div className="sticky top-20 flex flex-col gap-4">
        {/* Dockerfile Section */}
        <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-white">Dockerfile</h3>
            <button
              onClick={handleBuild}
              className="rounded-md bg-green-600 px-4 py-1.5 text-sm font-medium text-white hover:bg-green-500 disabled:opacity-50"
              disabled={state.images.some(img => img.isBuilding)}
            >
              Build
            </button>
          </div>
          <pre className="max-h-32 overflow-x-auto overflow-y-auto rounded bg-gray-900 p-3 font-mono text-xs text-gray-300">
            {state.dockerfileCode}
          </pre>
        </div>

        {/* Images and Containers Grid */}
        <div className="grid grid-cols-2 gap-4">
          {/* Images */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Images</h3>
            <div className="flex flex-col gap-2">
              {state.images.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No images built yet</p>
              ) : (
                state.images.map(image => (
                  <div
                    key={image.id}
                    className={`group relative rounded-md border p-2 text-sm ${
                      image.isBuilding ? 'animate-pulse border-blue-500/50 bg-blue-900/20' : 'border-blue-500/50 bg-blue-900/30'
                    }`}
                  >
                    {image.isBuilding && (
                      <div className="absolute inset-0 overflow-hidden rounded-md">
                        <div className="animate-shimmer h-full w-full bg-gradient-to-r from-transparent via-blue-400/20 to-transparent" />
                      </div>
                    )}
                    <div className="relative flex items-center justify-between">
                      <span className="font-mono text-xs text-blue-200">{image.isBuilding ? 'Building...' : `${image.name}:${image.tag}`}</span>
                      {!image.isBuilding && (
                        <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                          <button
                            onClick={() => handleRunContainer(image.id)}
                            className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-500"
                            title="Run container"
                          >
                            Run
                          </button>
                          <button
                            onClick={() => handleDeleteImage(image.id)}
                            className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-500"
                            title="Delete image"
                          >
                            Delete
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Containers */}
          <div className="rounded-lg border border-gray-700 bg-gray-800 p-4">
            <h3 className="mb-3 text-sm font-semibold text-white">Containers</h3>
            <div className="flex flex-col gap-2">
              {state.containers.length === 0 ? (
                <p className="text-xs text-gray-400 italic">No containers running</p>
              ) : (
                state.containers.map(container => (
                  <div
                    key={container.id}
                    className={`group relative rounded-md border p-2 text-sm ${
                      container.status === 'running' ? 'border-green-500/50 bg-green-900/30' : 'border-red-500/50 bg-red-900/30'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={`h-2 w-2 rounded-full ${container.status === 'running' ? 'bg-green-500' : 'bg-red-500'}`} />
                        <span className={`font-mono text-xs ${container.status === 'running' ? 'text-green-200' : 'text-red-200'}`}>
                          {container.name}
                        </span>
                      </div>
                      <div className="flex gap-1 opacity-0 transition-opacity group-hover:opacity-100">
                        {container.status === 'running' ? (
                          <button
                            onClick={() => handleStopContainer(container.id)}
                            className="rounded bg-yellow-600 px-2 py-0.5 text-xs text-white hover:bg-yellow-500"
                            title="Stop container"
                          >
                            Stop
                          </button>
                        ) : (
                          <button
                            onClick={() => handleRunContainer(container.imageId)}
                            className="rounded bg-green-600 px-2 py-0.5 text-xs text-white hover:bg-green-500"
                            title="Start container"
                          >
                            Start
                          </button>
                        )}
                        <button
                          onClick={() => handleDeleteContainer(container.id)}
                          className="rounded bg-red-600 px-2 py-0.5 text-xs text-white hover:bg-red-500"
                          title="Delete container"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Info */}
        <div className="rounded border border-gray-700 bg-gray-800/50 p-3 text-xs text-gray-400">
          <p className="mb-1">
            <strong className="text-gray-300">Tip:</strong> Click Build to create an image from the Dockerfile.
          </p>
          <p>Click Run on an image to start a container. Hover over items to see actions.</p>
        </div>
      </div>
    </div>
  );
}
