import {
	Mesh,
	BufferGeometry,
	TorusGeometry,
	Scene,
	Raycaster,
	MeshBasicMaterial,
	InterleavedBuffer,
	InterleavedBufferAttribute,
} from 'three';
import {
	acceleratedRaycast,
	computeBoundsTree,
	disposeBoundsTree,
	CENTER,
	SAH,
	AVERAGE,
} from '../src/index.js';
import { random, setSeed } from './utils.js';

Mesh.prototype.raycast = acceleratedRaycast;
BufferGeometry.prototype.computeBoundsTree = computeBoundsTree;
BufferGeometry.prototype.disposeBoundsTree = disposeBoundsTree;

describe( 'Random CENTER intersections', () => runRandomTests( { strategy: CENTER } ) );
describe( 'Random Interleaved CENTER intersections', () => runRandomTests( { strategy: CENTER, interleaved: true } ) );
describe( 'Random Indirect Buffer CENTER intersections', () => runRandomTests( { strategy: CENTER, indirect: true } ) );

describe( 'Random AVERAGE intersections', () => runRandomTests( { strategy: AVERAGE } ) );
describe( 'Random Interleaved AVERAGE intersections', () => runRandomTests( { strategy: AVERAGE, interleaved: true } ) );
describe( 'Random Indirect Buffer AVERAGE intersections', () => runRandomTests( { strategy: AVERAGE, indirect: true } ) );

describe( 'Random SAH intersections', () => runRandomTests( { strategy: SAH } ) );
describe( 'Random Interleaved SAH intersections', () => runRandomTests( { strategy: SAH, interleaved: true } ) );
describe( 'Random Indirect Buffer SAH intersections', () => runRandomTests( { strategy: SAH, indirect: true } ) );

function runRandomTests( options ) {

	const transformSeed = Math.floor( Math.random() * 1e10 );
	describe( `Transform Seed : ${ transformSeed }`, () => {

		let scene,
			raycaster,
			ungroupedGeometry,
			ungroupedBvh,
			groupedGeometry,
			groupedBvh;

		beforeAll( () => {

			ungroupedGeometry = new TorusGeometry( 1, 1, 40, 10 );
			groupedGeometry = new TorusGeometry( 1, 1, 40, 10 );

			if ( options.interleaved ) {

				ungroupedGeometry.setAttribute( 'position', createInterleavedPositionBuffer( ungroupedGeometry.attributes.position ) );
				groupedGeometry.setAttribute( 'position', createInterleavedPositionBuffer( groupedGeometry.attributes.position ) );

			}

			const groupCount = 10;
			const groupSize = groupedGeometry.index.array.length / groupCount;

			for ( let g = 0; g < groupCount; g ++ ) {

				const groupStart = g * groupSize;
				groupedGeometry.addGroup( groupStart, groupSize, 0 );

			}

			groupedGeometry.computeBoundsTree( options );
			ungroupedGeometry.computeBoundsTree( options );

			ungroupedBvh = ungroupedGeometry.boundsTree;
			groupedBvh = groupedGeometry.boundsTree;

			scene = new Scene();
			raycaster = new Raycaster();

			setSeed( transformSeed );
			random(); // call random() to seed with a larger value

			for ( var i = 0; i < 10; i ++ ) {

				let geo = i % 2 ? groupedGeometry : ungroupedGeometry;
				let mesh = new Mesh( geo, new MeshBasicMaterial() );
				mesh.rotation.x = random() * 10;
				mesh.rotation.y = random() * 10;
				mesh.rotation.z = random() * 10;

				mesh.position.x = random();
				mesh.position.y = random();
				mesh.position.z = random();

				scene.add( mesh );
				mesh.updateMatrix( true );
				mesh.updateMatrixWorld( true );

			}

		} );

		for ( let i = 0; i < 100; i ++ ) {

			const raySeed = Math.floor( Math.random() * 1e10 );
			it( `Cast ${ i } Seed : ${ raySeed }`, () => {

				setSeed( raySeed );
				random(); // call random() to seed with a larger value

				raycaster.firstHitOnly = false;
				raycaster.ray.origin.set( random() * 10, random() * 10, random() * 10 );
				raycaster.ray.direction.copy( raycaster.ray.origin ).multiplyScalar( - 1 ).normalize();

				ungroupedGeometry.boundsTree = ungroupedBvh;
				groupedGeometry.boundsTree = groupedBvh;
				const bvhHits = raycaster.intersectObject( scene, true );

				raycaster.firstHitOnly = true;
				const firstHit = raycaster.intersectObject( scene, true );

				ungroupedGeometry.boundsTree = null;
				groupedGeometry.boundsTree = null;
				const ogHits = raycaster.intersectObject( scene, true );

				expect( ogHits ).toEqual( bvhHits );
				expect( firstHit[ 0 ] ).toEqual( ogHits[ 0 ] );

			} );

		}

	} );

}

function createInterleavedPositionBuffer( bufferAttribute ) {

	const array = bufferAttribute.array;
	const newArray = new array.constructor( array.length * 2 );
	const newBuffer = new InterleavedBufferAttribute( new InterleavedBuffer( newArray, 6 ), 3, 3, bufferAttribute.normalized );
	for ( let i = 0; i < bufferAttribute.count; i ++ ) {

		newBuffer.setXYZ(
			i,
			bufferAttribute.getX( i ),
			bufferAttribute.getY( i ),
			bufferAttribute.getZ( i ),
		);

	}

	return newBuffer;

}
