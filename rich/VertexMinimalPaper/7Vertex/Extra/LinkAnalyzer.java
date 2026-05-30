import java.util.Arrays;

public class LinkAnalyzer {

    /**All edges of the torus are either internal or external. The two sets are
       complementary.  This routine starts with the external edges 
       and gets the internal edges.*/
    

    public static int[][] externalEdges(int[][] e) {
	int[][] list=new int[15][2];
	int count=0;
	
	for(int i=0;i<21;++i) {
	    int[] ee=TorusCombinatorics.edge(i);
	    boolean test=false;
	    for(int j=0;j<6;++j) {
		if(ListHelp.match(ee,e[j])==true) {
		    test=true;
		    break;
		}
	    }
	    if(test==false) {
		list[count]=ee;
		++count;
	    }
	}
	return list;
    }

    /**This routine does the same for the external faces.
       It starts with the internal faces and gets the
       complementary set of external faces.*/
    
    
    public static int[][] externalFaces(int[][] f) {
	int[][] list=new int[14-f.length][3];
	int count=0;
	
	for(int i=0;i<14;++i) {
	    int[] ee=TorusCombinatorics.face(i);
	    boolean test=false;
	    for(int j=0;j<f.length;++j) {
		if(ListHelp.match(ee,f[j])==true) {
		    test=true;
		    break;
		}
	    }
	    if(test==false) {
  		list[count]=ee;
		++count;
	    }
	}
	return list;
    }


    /**This routine picks a vertex k and returns all the
       external edges that are incident to it.  We start
        with the internal edges and then explicitly get their
	complement.*/
    

    public static int[] convexLink(int[][] e,int k) {
	int[] list=new int[6];
	int count=0;
	for(int i=0;i<7;++i) {
	    if(i!=k) {
		int[] ee={k,i};
		boolean test=false;
		for(int j=0;j<6;++j) {
		    if(ListHelp.match(ee,e[j])==true) {
			test=true;
			break;
		    }
		}
		if(test==false) {
		    list[count]=i;
		    ++count;
		}
	    }
	}
	return Arrays.copyOf(list,count);
    }

    /**This gets the degree sequence*/

    public static int[] degreeSequence(int[][] e) {
	int[] list=new int[7];
	for(int k=0;k<7;++k) {
	    int[] t=convexLink(e,k);
	    list[k]=t.length;
	}
	return list;
    }


    public static boolean hexTest(int k) {
	for(int i=0;i<7;++i) {
	    if(hexTest(k,i)==false) return false;
	}
	return true;
    }

    public static boolean hexTest(int k,int i) {
	int[][] e=TorusCombinatorics.internalEdges(k);
	int[][] f=TorusCombinatorics.internalFaces(k);
	int[] d=degreeSequence(e);
	int a=d[i];
	int count=0;
	for(int j=0;j<f.length;++j) {
	    if(ListHelp.onList(i,f[j],3)==true) ++count;
	}
	if((a==6)&&(count>0)) return false;
	if((a==5)&&(count>2)) return false;
	return true;
    }

    
	

    /**This routine looks at the link of vertex k on the convex hull boundary,
       and tries to deduce part of the cyclic order on the link.  If there is an
       external triangle incident to vertex k then the opposite edge of this 
       triangle is necessarily in the link.  So, this program gets all these forced
       members of the link.*/

    public static int[][] forcedLink(int[][] e0,int[][] f0,int k) {
	int count=0;
	int[][] list=new int[6][2];
	int[][] f=externalFaces(f0);
	int[] L=convexLink(e0,k);
	for(int i=0;i<L.length;++i) {
	    for(int j=i+1;j<L.length;++j) {
		int[] LL={L[i],L[j],k};
		for(int q=0;q<f.length;++q) {
		    if(ListHelp.match(LL,f[q])==true) {
			list[count]=new int[2];
			list[count][0]=L[i];
			list[count][1]=L[j];
			++count;
			break;
		    }
		}
	    }
	}
	return Arrays.copyOf(list,count);
    }


    /**Since the link is a cycle we can dihedrally permute the elements.
       We call the cycle minimal if the first element is smallest and if
       the second element is smaller than the last element.  Returns true
       iff the cycle is minimal.  All elements of the cycle are distinct.*/

    public static boolean isMinimal(int[] cycle) {
	if(cycle[1]>cycle[cycle.length-1]) return false;
	for(int i=0;i<cycle.length;++i) {
	    if(cycle[0]>cycle[i]) return false;
	}
	return true;
    }

    /** Given the list of vertices in the link, we still need to find
        viable cycle structures. This amounts to taking all possible
        permutations and evaluating them one at a time.  This first
        routine makes sure that all the forced connections, calculated
        above, appear in the given permutation.  Returns true iff 
        this happens.*/

    
    public static boolean hasForcedConnections(int[][] e,int[][] f,int k,int[] cycle) {
	int[][] L=forcedLink(e,f,k);
	for(int i=0;i<L.length;++i) {
	    boolean test=false;
	    for(int j=0;j<cycle.length;++j) {
		int jj=(j+1)%cycle.length;
 		int[] LL={cycle[j],cycle[jj]};
		if(ListHelp.match(L[i],LL)==true) {
		    test=true;
		    break;
		}
	    }
	    if(test==false) return false;
	}
	return true;
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


    /**This routine combines the previous 3 routines into a single
       test. Given a candidate permutation, we check that it is
       minimal, has all forced connections, no disallowed connections*/
    
    public static boolean testCycle(int[][] e,int[][] f,int k,int[] cycle) {
	if(cycle.length<3) return false;
	if(isMinimal(cycle)==false) return false;
	if(hasForcedConnections(e,f,k,cycle)==false) return false;
	if(onlyAllowedConnections(e,cycle)==false) return false;
	return true;
    }

    /**This routine tests all the cycles associated to the kth 
       internal edge pattern -- i.e. 6-element set of internal edges.
       The routine returns true iff each vertex has at least one
       viable link permutation, as defined above.*/

    public static boolean testCycle(int k) {
	int[][] edge=TorusCombinatorics.internalEdges(k);
	int[][] face=TorusCombinatorics.internalFaces(k);
	for(int i=0;i<7;++i) {
	    int count=0;
	    int[] link=convexLink(edge,i);
	    for(int ii=0;ii<ListHelp.factorial(link.length);++ii) {
		int[] candidate=ListHelp.per(link,ii);
		boolean test=LinkAnalyzer.testCycle(edge,face,i,candidate);
		if(test==true) ++count;
	    }
	    if(count==0) return false;
	}
	return true;
    }
    


}


