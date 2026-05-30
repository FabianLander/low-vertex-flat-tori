import java.util.Arrays;

/**This class lets you do some debugging*/

public class Debugger {


    public static void debug(Manager M,int k) {
	if(k==0) debug0(M);
	if(k==1) debug1(M);
	if(k==2) debug2(M);
	if(k==3) debug3(M);
	if(k==4) debug4(M);
	if(k==5) debug5(M);
	if(k==6) debug6(M);
    }


    public static void debug0(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	System.out.println("absolute pattern number");
	System.out.println("internal edges");
	int[][] edge=TorusCombinatorics.internalEdges(k);
	for(int i=0;i<6;++i) ListHelp.printout(edge[i]);
    }


    public static void debug1(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	System.out.println("absolute pattern number");
	System.out.println("internal faces");
	int[][] face=TorusCombinatorics.internalFaces(k);
	for(int i=0;i<face.length;++i) ListHelp.printout(face[i]);
    }


    public static void debug2(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
       	int[][] edge=TorusCombinatorics.internalEdges(k);
	System.out.println("unordered links");
	for(int i=0;i<7;++i) {
	    int[] link=LinkAnalyzer.convexLink(edge,i);
	    System.out.print(i+": ");
	    ListHelp.printout(link);
	}
	    
    }


    public static void debug3(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	int[] list=testCycle(k);
	if(list.length==0) System.out.println("passes link test");
	if(list.length>0) {
	    System.out.print("failures at ");
	    ListHelp.printout(list);
	}
    }


    public static void debug4(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	int[][] list=testDiamond(k);
	if(list.length==0) System.out.println("passes diamond test");
	if(list.length>0) {
	    System.out.println("failures at ");
	    for(int i=0;i<list.length;++i) ListHelp.printout(list[i]);
	}
    }


    public static void debug5(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}
	int[][] list=testDoubleDiamond(k);
	if(list.length==0) System.out.println("passes double diamond test");
	if(list.length>0) {
	    System.out.println("failures at ");
	    for(int i=0;i<list.length;++i) ListHelp.printout(list[i]);
	}
    }


    public static void debug6(Manager M) {
	int k=M.P.PATTERN;
	if(k==-1) {
	    System.out.println("no pattern selected");
	    return;
	}

	int[] list=testHex(k);
	if(list.length==0) System.out.println("passes hex test");
	if(list.length>0) {
	    System.out.println("failures at ");
	    ListHelp.printout(list);
	}
    }

    
    /**This is a mirror of the routine in LinkAnalyzer.java, except that it
       returns the indices of all places where the cycle test fails*/

    public static int[] testCycle(int k) {
	int count_fail=0;
	int[] failure=new int[7];
	
	int[][] edge=TorusCombinatorics.internalEdges(k);
	int[][] face=TorusCombinatorics.internalFaces(k);
	for(int i=0;i<7;++i) {
	    int count=0;
	    int[] link=LinkAnalyzer.convexLink(edge,i);
	    for(int ii=0;ii<ListHelp.factorial(link.length);++ii) {
		int[] candidate=ListHelp.per(link,ii);
		boolean test=LinkAnalyzer.testCycle(edge,face,i,candidate);
		if(test==true) ++count;
	    }
	    if(count==0) {
		failure[count_fail]=i;
		++count_fail;
	    }
	}
	return Arrays.copyOf(failure,count_fail);
    }
    

    /**This mirrors the DiamondTest in TorusCombinatorics.java*/

    public static int[][] testDiamond(int k) {
	int count_fail=0;
	int[][] failure=new int[6][2];
	int[][] e=TorusCombinatorics.internalEdges(k);
	for(int i=0;i<6;++i) {
	    int t=TorusCombinatorics.diamondNumber(k,i);
	    if(t==0) {
		failure[count_fail]=e[i];
		++count_fail;
	    }
	}
	return Arrays.copyOf(failure,count_fail);
    }

    /**This mirrors the DoubleDiamondTest in TorusCombinatorics.java*/
    

    public static int[][] testDoubleDiamond(int k) {
	int[][] e=TorusCombinatorics.internalEdges(k);
	int count_fail=0;
	int[][] failure=new int[6][4];
	
	for(int i=0;i<6;++i) {
	    for(int j=i+1;j<6;++j) {
		if(TorusCombinatorics.testIncidentAndAdjacent(e[i],e[j])==true) {
		    int d1=TorusCombinatorics.diamondNumber(k,i);
		    int d2=TorusCombinatorics.diamondNumber(k,j);
		    if((d1==1)&&(d2==1)) {
			int[] ee={e[i][0],e[i][1],e[j][0],e[j][1]};
    	                failure[count_fail]=ee;
		        ++count_fail;
		    }
		}
	    }
	}
	return Arrays.copyOf(failure,count_fail);
    }

    /**This mirrors the hextest routine*/
    
    public static int[] testHex(int k) {
	int count=0;
	int[] list=new int[7];
	int[][] e=TorusCombinatorics.internalEdges(k);
	int[][] f=TorusCombinatorics.internalFaces(k);
	int[] d=LinkAnalyzer.degreeSequence(e);
	for(int i=0;i<7;++i) {
	    if(d[i]==6) {
		boolean test=false;
		for(int j=0;j<f.length;++j) {
		    if(ListHelp.onList(i,f[j],3)==true) test=true;
		}
		if(test==true) {
		    list[count]=i;
		    ++count;
		}
	    }
	}
	return Arrays.copyOf(list,count);
    }
	


}
