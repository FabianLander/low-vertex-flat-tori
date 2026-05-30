import java.util.Arrays;

public class LinkAnalyzer {

    
/**This class performs all the tests for the proof of the
   Hull Theorem in our paper. The file works with ListHelp.java
   to manipulate lists*/


    
    /**Returns kth edge of the complete graph K7. This is also the
       1-skeleton of the 7-vertex triangulation of the torus*/
    
    public static int[] edge(int k) {
	int[][] f={{0,1},{0,2},{0,3},{0,4},{0,5},{0,6},{1,2},{1,3},{1,4},{1,5},{1,6},{2,3},{2,4},{2,5},{2,6},{3,4},{3,5},{3,6},{4,5},{4,6},{5,6}};
	return f[k];
    }
    
    /**Returns kth face in the 7-vertex triangulation of the torus.*/

    public static int[] face(int k) {
	int[][] f={{0,1,3},{0,5,1},{0,3,2},{0,2,6},{0,4,5},{0,6,4},{1,2,4},{1,4,3},{1,6,2},{1,5,6},{2,3,5},{2,5,4},{3,4,6},{3,6,5}};
   	return f[k];
    }

    public static int[] torusLink(int k) {
	int[][] L={{1,3,2,6,4,5},{0,5,6,2,4,3},{0,3,5,4,1,6},{0,1,4,6,5,2},{0,6,3,1,2,5},{0,4,2,3,6,1},{0,2,1,5,3,4}};
	return L[k];
    }

    /**End basic data*/


    /**This gets the kth choice of 6 element subset of the edges and
       then returns the corresponding edges.*/
    
    public static int[][] internalEdges(int k) {
	int[] t=ListHelp.subsetGenerator(k);
	int[][] list=new int[6][2];
	for(int i=0;i<6;++i) {
	    list[i]=edge(t[i]);
	}
	return list;
    }

    /**This gets the triangles incident to the edge list from the previous routine.*/

    public static int[][] internalFaces(int k) {
	int[] t=ListHelp.subsetGenerator(k);
	int[] list1=new int[12];
	int count=0;
	
	for(int i=0;i<6;++i) {
	    int[] ee=edge(t[i]);
	    for(int j=0;j<14;++j) {
		if(incident(ee,face(j))==true) {
		    list1[count]=j;
		    ++count;
		}
	    }
	}
	list1=ListHelp.irredundantSortedList(list1);

	int[][] list2=new int[list1.length][3];
	for(int i=0;i<list1.length;++i) list2[i]=face(list1[i]);
	return list2;
    }

    /**Returns true if edge e is incident to face f.*/
    
    public static boolean incident(int[] e,int[] f) {
	if(ListHelp.onList(e[0],f,3)==false) return false;
	if(ListHelp.onList(e[1],f,3)==false) return false;
	return true;
    }


    /**This routine picks a vertex k and returns all the
       external edges that are incident to it.  We start   
        with the internal edges and then explicitly get their
	complement.*/
    

      public static int[] convexLink(int[][] e,int k) {
	  int[] L=torusLink(k);
	int[] list=new int[6];
	int count=0;
	for(int i=0;i<6;++i) {
	    int[] ee={k,L[i]};
	    boolean test=false;
	    for(int j=0;j<6;++j) {
		if(ListHelp.match(ee,e[j])==true) {
		  test=true;
		  break;
		}
	    }
	    if(test==false) {
	       list[count]=L[i];
	       ++count;
	    }
	}
	return Arrays.copyOf(list,count);
    }

    /**This one evaluates permutations of the list of incident vertices, as 
       described above.  Here we look at a candidate cycle and make sure
       that consecutive elements are not internal edges.  These would not
       appear as edges in the convex hull boundary. Returns true iff there
       is no internal edge like this.*/
    
    public static boolean onlyAllowedConnections(int[][] e,int[] cycle) {
	for(int i=0;i<cycle.length;++i) {
	    int ii=(i+1)%cycle.length;
	    int[] L={cycle[i],cycle[ii]};
	    for(int j=0;j<6;++j) {
		if(ListHelp.match(L,e[j])==true) return false;
	    }
	}
	return true;
    }

    /**This returns the link if it is viable and otherwise returns null*/
    
    public static int[] getViableCycle(int k,int i) {
	int[][] edge=internalEdges(k);
	int count=0;
	int[] link=LinkAnalyzer.convexLink(edge,i);
	if(link.length<3) return null;
	if(onlyAllowedConnections(edge,link)==false) return null;
	return link;
    }

    
    /**This routine tests all the cycles associated to the kth 
       internal edge pattern -- i.e. 6-element set of internal edges.
       The routine returns true iff each vertex has at least one
       viable link permutation, as defined above.*/

    public static boolean mainTest(int[] filter,int k) {
	for(int i=0;i<7;++i) {
  	    int[] cyc=getViableCycle(k,i);
	    if((filter[i]==1)&&(cyc==null)) return false;
	}
	return true;
    }

}


