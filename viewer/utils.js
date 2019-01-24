// Initially 10MB of zero'ed out buffer. Will increase over time when needed, used in Utils.createEmptyBuffer
var zeroBuffer = new ArrayBuffer(10000000);
var zeroDataView = new DataView(zeroBuffer);

const glTypeToTypedArrayMap = new Map([
	[WebGL2RenderingContext.BYTE, Int8Array],
	[WebGL2RenderingContext.SHORT, Int16Array],
	[WebGL2RenderingContext.INT, Int32Array],
	[WebGL2RenderingContext.UNSIGNED_BYTE, Uint8Array],
	[WebGL2RenderingContext.UNSIGNED_SHORT, Uint16Array],
	[WebGL2RenderingContext.UNSIGNED_INT, Uint32Array],
	[WebGL2RenderingContext.FLOAT, Float32Array]
]);

const typedArrayToGlTypeMap = new Map([
	["Int8Array", WebGL2RenderingContext.BYTE],
	["Int16Array", WebGL2RenderingContext.SHORT],
	["Int32Array", WebGL2RenderingContext.INT],
	["Uint8Array", WebGL2RenderingContext.UNSIGNED_BYTE],
	["Uint16Array", WebGL2RenderingContext.UNSIGNED_SHORT],
	["Uint32Array", WebGL2RenderingContext.UNSIGNED_INT],
	["Float32Array", WebGL2RenderingContext.FLOAT]
]);

/**
 * Generic utils
 *
 * @export
 * @class Utils
 */
export default class Utils {
	static hash(input) {
		  var hash = 0, i, chr;
		  if (input.length === 0) return hash;
		  for (i = 0; i < input.length; i++) {
		    chr   = input.charCodeAt(i);
		    hash  = ((hash << 5) - hash) + chr;
		    hash |= 0; // Convert to 32bit integer
		  }
		  return hash;
	}

	static typedArrayToGlType(typedArrayType) {
		return typedArrayToGlTypeMap.get(typedArrayType);
	}

	static glTypeToTypedArray(glType) {
		return glTypeToTypedArrayMap.get(glType)
	}
	
	/**
	 * Converts the given 4x4 mat4 to an array
	 */
	static toArray(matrix) {
		var result = new Array(16);
		for (var i=0; i<16; i++) {
			result[i] = matrix[i];
		}
		return result;
	}

	/**
	 * Create a new GPU buffer, keep in mind that some extra attributes are being set on the returned GLBuffer object
	 */
	static createBuffer(gl, data, numElements, bufferType, components, srcStart, attribType, js_type) {
		// numElements -> Number of typed elements
		numElements = numElements || data.length;
		bufferType = bufferType || gl.ARRAY_BUFFER;
		components = components || 3;
		srcStart = srcStart || 0;

		const b = gl.createBuffer();
		gl.bindBuffer(bufferType, b);
		var js_type = js_type ? js_type : data.constructor.name;
		const byteCount = numElements * window[js_type].BYTES_PER_ELEMENT;
		
		// Read the WebGL documentation carefully on this, the interpretation of the size argument depends on the type of "data"
		let size = numElements; // Ok for non-typed arrays
		if (data.constructor.name == "DataView") {
			size = byteCount;
		}
		gl.bufferData(bufferType, data, gl.STATIC_DRAW, srcStart, size);
		
		b.byteSize = byteCount;
		b.N = numElements;
		b.gl_type = bufferType;
		b.js_type = js_type;
		b.attrib_type = attribType ? attribType : Utils.typedArrayToGlType(b.js_type);
		b.components = components;
		b.normalize = false;
		b.stride = 0;
		b.offset = 0;
		return b;
	}

	/**
	 * Create a new GPU empty buffer, keep in mind that some extra attributes are being set on the returned GLBuffer object.
	 * This method is usually used in order to create buffers that will be later be filled by calls to bufferSubData (via Utils.updateBuffer)
	 */
	static createEmptyBuffer(gl, numElements, bufferType, components, attribType, js_type) {
		const nrBytesRequired = numElements * window[js_type].BYTES_PER_ELEMENT;
		// This caching is disabled for now, it seems as though both Firefox and Chrome copy (!) the complete (mostly empty) buffer for each (!) bufferData call.
		// This resulted in about 48GB being used on Firefox for a moderately big model.
		// I can imagine them doing this in order to being able to restore stuff after a context-lose... Or my code contains a stupid error
		if (false) {
			if (nrBytesRequired > zeroBuffer.byteLength) {
				// According to the documentation, you should be able to pass `null` to gl.bufferData, but both Chrome and Firefox do not allow this
				console.log("Increasing size of zero'ed-buffer", nrBytesRequired);
				zeroBuffer = new ArrayBuffer(nrBytesRequired);
				zeroDataView = new DataView(zeroBuffer);
			}
		} else {
			zeroBuffer = new ArrayBuffer(nrBytesRequired);
			zeroDataView = new DataView(zeroBuffer);
		}

		const buffer = this.createBuffer(gl, zeroDataView, numElements, bufferType, components, 0, attribType, js_type);
		buffer.writePosition = 0;
		
		return buffer;
	}
	
	/**
	 * Update a GPU buffer
	 */	
	static updateBuffer(gl, targetGlBuffer, data, pos, numElements) {
		gl.bindBuffer(targetGlBuffer.gl_type, targetGlBuffer);
		const byteCount = numElements * window[targetGlBuffer.js_type].BYTES_PER_ELEMENT;
		
		// Read the WebGL documentation carefully on this, the interpretation of the size argument depends on the type of "data"
		let size = numElements; // Ok for non-typed arrays
		if (data.constructor.name == "DataView") {
			size = byteCount;
		}
		
		gl.bufferSubData(targetGlBuffer.gl_type, targetGlBuffer.writePosition, data, pos, size);
		targetGlBuffer.writePosition += byteCount;
	}
	
	static createIndexBuffer(gl, data, n) {
		return Utils.createBuffer(gl, data, n, gl.ELEMENT_ARRAY_BUFFER);
	}

	static unionAabb(a, b) {
		let r = new Float32Array(6);
		for (let i = 0; i < 6; ++i) {
			let fn = i < 3 ? Math.min : Math.max;
			r[i] = fn(a[i], b[i]);
		}
		return r;
	}

	static emptyAabb() {
		let i = Infinity;
		return new Float32Array([i,i,i,-i,-i,-i]);
	}
}