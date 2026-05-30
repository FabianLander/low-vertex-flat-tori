import java.util.Arrays;

/**This class performs all the tests for the proof of the
   Hull Theorem in our paper.*/

public class TorusCombinatorics {

    /**Basic data*/

    
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

    /**End basic data*/



    /**Edge and face subset routines*/
    

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

    /**This gets the triangles incident to the edge list from the previous routine.
       This routine is not used in the proof. It is just used for drawing purposes*/

    public static int[][] internalFaces(int k) {
	int[] t=ListHelp.subsetGenerator(k);
	int[] list1=new int[12];
	int count=0;
	
	for(int i=0;i<6;++i) {
	    int[] ee=edge(t[i]);
	    for(int j=0;j<14;++j) {
		if(incident(ee,TorusCombinatorics.face(j))==true) {
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

    /**End edge and face getting routines*/


    


    
    /**This gets the list of internal edges corresponding to the kth 6-element subset
       and then returns true if at least one edge is incident to each of the 7 vertices*/
    
    public static boolean testRuleOfSeven(int k) {
	int[] t=ListHelp.subsetGenerator(k);
	int[] list=new int[12];
	for(int i=0;i<6;++i) {
	    int[] a=edge(t[i]);
	    list[2*i+0]=a[0];
	    list[2*i+1]=a[1];
	}
	Arrays.sort(list);
 	list=ListHelp.irredundantSortedList(list);
	if(list.length<7) return false;
	return true;
    }


    /**This gets the list of internal edges corresponding to the kth 6-element subset
       and then returns true if no more than 3 of the edges are incident to any vertex*/

    public static boolean testRuleOf3(int k) {
	int[][] e=internalEdges(k);
	for(int i=0;i<7;++i) {
	    int count=0;
	    for(int j=0;j<6;++j) {
		if(ListHelp.onList(i,e[j],2)==true) ++count;
	    }
	    if(count>3) return false;
	}
	return true;
    }





    /**Basic incidence testing routines*/



    /**Tests whether two edges are incident and adjacent*/

    public static boolean testIncidentAndAdjacent(int[] e1,int[] e2) {
	for(int i=0;i<14;++i) {
	    int[] f=face(i);
	    boolean test1=incident(e1,f);
	    boolean test2=incident(e2,f);
	    if((test1==true)&&(test2==true)) return true;
	}
	return false;
    }


    /**Returns true if edge e is incident to face f.*/
    
    public static boolean incident(int[] e,int[] f) {
	if(ListHelp.onList(e[0],f,3)==false) return false;
	if(ListHelp.onList(e[1],f,3)==false) return false;
	return true;
    }

    /**Gets the two faces incident to edge e*/
    
    public static int[][] facesIncidentTo(int[] e) {
	int[][] list=new int[2][3];
	int count=0;
	for(int i=0;i<14;++i) {
	    int[] f=face(i);
	    if(incident(e,f)==true) {
		list[count]=f;
		++count;
	    }
	}
	return list;
    }

    /**End incidence testing routines*/



    /**diamond tests*/

    
    /**Returns the four edges from the two triangles incident to edge e,
    excluding e itself. These form the diamond neighborhood around e.*/

    public static int[][] diamondNeighborhood(int[] e) {
	int[][] f=facesIncidentTo(e);
	int[][] list={{f[0][0],f[0][1]},{f[0][0],f[0][2]},{f[0][1],f[0][2]},
		      {f[1][0],f[1][1]},{f[1][0],f[1][2]},{f[1][1],f[1][2]}};
	int[][] list2=new int[4][2];
	int count=0;
	for(int i=0;i<6;++i) {
	    if(ListHelp.match(e,list[i])==false) {
		list2[count]=list[i];
		++count;
	    }
	}
	return list2;
    }

    /**This gets the kth 6-element pattern of edges, then considers the ith edge.
       Given the ith edge e, we then count the number of edges in the diamond
       neighborhood which belong to the pattern.*/

    public static int diamondNumber(int k,int i) {
	int[][] e=internalEdges(k);
	int[][] f=diamondNeighborhood(e[i]);
	int count=0;
	    
	for(int j=0;j<4;++j) {
	   boolean inPattern=false;
	   for(int q=0;q<6;++q) {
	       boolean test=ListHelp.match(f[j],e[q]);
	       if(test==true) inPattern=true;
	   }
	   if(inPattern==true) ++count;
	}
	return count;
    }

    /**This tests the Diamond Rule for the kth 6-edge pattern P.
       Returns true when the diamond number of each edge in P is at least 1. That is,
       returns true when, for each edge in P, the diamond neighborhood of the edge
       nontrivially intersects P*/

    public static boolean testDiamond(int k) {
	int[][] e=internalEdges(k);
	for(int i=0;i<6;++i) {
	    int t=diamondNumber(k,i);
	    if(t==0) return false;
	}
	return true;
    }

    /**This tests the Double Diamond Rule for the kth 6-edge pattern P.
       Considers all pairs of incident edges e1,e2 of P.  This returns
       false if there exists a pair e1,e2 having both diamond numbers
       equal to 1. Otherwise returns true.*/

    public static boolean testDoubleDiamond(int k) {
	int[][] e=internalEdges(k);
	for(int i=0;i<6;++i) {
	    for(int j=i+1;j<6;++j) {
		if(testIncidentAndAdjacent(e[i],e[j])==true) {
		    int d1=diamondNumber(k,i);
		    int d2=diamondNumber(k,j);
		    if((d1==1)&&(d2==1)) return false;
		}
	    }
	}
	return true;
    }

    /**End diamond tests*/

    /**This makes sure the second edge is 01, or 01 or 06, which we can assume by symmetry.*/
    public static boolean secondElementTest(int[] t) {
	if(t[1]==1) return true;
	if(t[1]==2) return true;
	if(t[1]==5) return true;
	return false;
    }
    

   /**Main test:  Gets the kth 6-element subset and then
      any combination of the 65structural tests (via the filter f),
      and returns true iff all selected tests pass and the second edge index
      lies in {1, 2, 3, 4, 5, 6}*/

    public static boolean filter(int[] f,int k) {
	int[] t=ListHelp.subsetGenerator(k);
	if(secondElementTest(t)==false) return false;
	if((f[0] == 1)&&(LinkAnalyzer.testCycle(k)==false)) return false;
	if((f[1] == 1)&&(testDiamond(k)==false)) return false;
	if((f[2] == 1) &&(testDoubleDiamond(k)==false)) return false;
	if((f[3] == 1) &&(LinkAnalyzer.hexTest(k)==false)) return false;
        return true;
    }

}
